import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pubIndex from './publications.index.json';

const MODELS_REPOSITORY = 'allometric/models';
const DEFAULT_LIMIT = 50;
const MODELS_HISTORY_DIR = process.env.MODELS_HISTORY_DIR ?? resolve(process.cwd(), '.models-history');

type PublicationRecord = { id: string };
type RawChange = { hash: string; date: string; subject: string; files: string[]; commitUrl?: string };
type ApiCommit = {
	sha: string;
	commit: {
		author?: { date?: string };
		committer?: { date?: string };
		message: string;
	};
	html_url: string;
};

export interface ModelChange {
	hash: string;
	shortHash: string;
	date: string;
	subject: string;
	description: string;
	type: string;
	kind: string;
	conventional: boolean;
	files: string[];
	publications: string[];
	commitUrl: string;
}

const publicationIds = new Set(
	(pubIndex as PublicationRecord[]).map(({ id }) => id),
);

function inferKind(subject: string): string {
	const firstWord = subject.split(/\s+/, 1)[0].toLowerCase().replace(/[^a-z]/g, '');
	if (firstWord === 'fix' || firstWord === 'fixed') return 'fix';
	if (firstWord === 'add' || firstWord === 'added') return 'add';
	if (firstWord === 'docs' || firstWord === 'documentation') return 'docs';
	if (firstWord === 'style' || firstWord === 'design') return 'style';
	return 'change';
}

function publicationIdsFromDiff(hash: string, files: string[], repoDir: string): string[] {
	const dataFiles = files.filter((file) => /(?:^|\/)publications(?:\.index)?\.json$/i.test(file));
	if (dataFiles.length === 0) return [];

	try {
		const diff = execFileSync(
			'git',
			['show', '--format=', '--unified=0', hash, '--', ...dataFiles],
			{ cwd: repoDir, encoding: 'utf8' },
		);
		const ids = [...diff.matchAll(/^[+-]\s*"id"\s*:\s*"([^"]+)"/gm)]
			.map((match) => match[1])
			.filter((id) => publicationIds.has(id));
		// A wholesale generated-index change does not identify affected records.
		return ids.length <= 20 ? [...new Set(ids)].sort() : [];
	} catch {
		return [];
	}
}

function publicationIdsFor(change: RawChange, repoDir?: string): string[] {
	const affected = new Set<string>();
	if (repoDir) {
		for (const id of publicationIdsFromDiff(change.hash, change.files, repoDir)) affected.add(id);
	}
	const publicationPath = /(?:^|\/)publications\/(?:[^/]+\/)*([^/]+)\.(?:ya?ml|json)$/i;

	for (const file of change.files) {
		const match = file.match(publicationPath);
		if (match && publicationIds.has(match[1])) affected.add(match[1]);
	}

	for (const id of publicationIds) {
		if (new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(change.subject)) {
			affected.add(id);
		}
	}

	return [...affected].sort();
}

function toModelChange(change: RawChange, repoDir?: string): ModelChange {
	const conventionalMatch = change.subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i);
	const type = conventionalMatch ? conventionalMatch[1].toLowerCase() : inferKind(change.subject);
	const kind = type === 'feat' ? 'add' : type;
	return {
		hash: change.hash,
		shortHash: change.hash.slice(0, 7),
		date: change.date,
		subject: change.subject,
		description: conventionalMatch ? conventionalMatch[4] : change.subject,
		type,
		kind,
		conventional: Boolean(conventionalMatch),
		files: change.files,
		publications: publicationIdsFor(change, repoDir),
		commitUrl: change.commitUrl ?? `https://github.com/${MODELS_REPOSITORY}/commit/${change.hash}`,
	};
}

function readGitHistory(limit: number): ModelChange[] {
	if (!existsSync(MODELS_HISTORY_DIR)) throw new Error('models history checkout is unavailable');
	const output = execFileSync(
		'git',
		[
			'log',
			`-${limit}`,
			'--date=iso-strict',
			'--pretty=format:%H|||%aI|||%s',
			'--name-only',
		],
		{ cwd: MODELS_HISTORY_DIR, encoding: 'utf8' },
	);
	const changes: RawChange[] = [];
	let current: RawChange | undefined;

	for (const line of output.split('\n')) {
		const header = line.match(/^([0-9a-f]{40})\|\|\|([^|]+)\|\|\|(.*)$/i);
		if (header) {
			if (current) changes.push(current);
			current = { hash: header[1], date: header[2], subject: header[3], files: [] };
		} else if (current && line.trim()) {
			current.files.push(line.trim());
		}
	}
	if (current) changes.push(current);

	return changes.map((change) => toModelChange(change, MODELS_HISTORY_DIR));
}

async function readGitHubHistory(limit: number): Promise<ModelChange[]> {
	const response = await fetch(`https://api.github.com/repos/${MODELS_REPOSITORY}/commits?per_page=${limit}`);
	if (!response.ok) throw new Error(`GitHub returned ${response.status} for models history`);
	const commits = (await response.json()) as ApiCommit[];
	return commits.map((commit) => {
		const raw: RawChange = {
			hash: commit.sha,
			date: commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date(0).toISOString(),
			subject: commit.commit.message.split('\n', 1)[0],
			files: [],
			commitUrl: commit.html_url,
		};
		return toModelChange(raw);
	});
}

/**
 * Read allometric/models history at build time. Pages checks out the models
 * repository into `.models-history`; the API fallback keeps local previews
 * useful without requiring a second checkout.
 */
export async function getLatestChanges(limit = DEFAULT_LIMIT): Promise<ModelChange[]> {
	try {
		return readGitHistory(limit);
	} catch (error) {
		console.warn('Models checkout unavailable; falling back to GitHub history:', error);
		try {
			return await readGitHubHistory(limit);
		} catch (apiError) {
			console.warn('Unable to read allometric/models history:', apiError);
			return [];
		}
	}
}
