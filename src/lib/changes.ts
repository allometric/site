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

const PUBLICATION_RECORD_PATH = /(?:^|\/)publications\/(?:[^/]+\/)*([^/]+)\.(?:ya?ml|json)$/i;
const publicationMentionPattern: Record<string, RegExp> = Object.fromEntries(
	[...publicationIds].map((id) => [id, new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')]),
);

function inferKind(subject: string): string {
	const firstWord = subject.split(/\s+/, 1)[0].toLowerCase().replace(/[^a-z]/g, '');
	if (firstWord === 'fix' || firstWord === 'fixed') return 'fix';
	if (firstWord === 'add' || firstWord === 'added') return 'add';
	if (firstWord === 'docs' || firstWord === 'documentation') return 'docs';
	if (firstWord === 'style' || firstWord === 'design') return 'style';
	return 'change';
}

function publicationIdsFor(change: RawChange): string[] {
	const affected = new Set<string>();

	for (const file of change.files) {
		const match = file.match(PUBLICATION_RECORD_PATH);
		if (match && publicationIds.has(match[1])) affected.add(match[1]);
	}

	for (const [id, mention] of Object.entries(publicationMentionPattern)) {
		if (mention.test(change.subject)) affected.add(id);
	}

	return [...affected].sort();
}

/**
 * A change affects publications when it edits a publication record or names
 * one in its subject. Compiled artifacts (dist/) and repository scaffolding
 * are regenerated alongside publication edits, so they do not qualify.
 */
function affectsPublications(change: RawChange): boolean {
	return (
		change.files.some((file) => PUBLICATION_RECORD_PATH.test(file)) ||
		Object.values(publicationMentionPattern).some((mention) => mention.test(change.subject))
	);
}

function toModelChange(change: RawChange): ModelChange {
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
		publications: publicationIdsFor(change),
		commitUrl: change.commitUrl ?? `https://github.com/${MODELS_REPOSITORY}/commit/${change.hash}`,
	};
}

/**
 * Walk the whole models checkout so the feed can still find `limit`
 * publication-affecting changes after non-publication commits are dropped.
 */
function readGitHistory(limit: number): ModelChange[] {
	if (!existsSync(MODELS_HISTORY_DIR)) throw new Error('models history checkout is unavailable');
	const output = execFileSync(
		'git',
		['log', '--date=iso-strict', '--pretty=format:%H|||%aI|||%s', '--name-only'],
		{ cwd: MODELS_HISTORY_DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
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

	return changes
		.filter(affectsPublications)
		.slice(0, limit)
		.map(toModelChange);
}

async function readGitHubHistory(limit: number): Promise<ModelChange[]> {
	// The commit list API omits changed files, so ask for the publication tree
	// directly and fall back to subjects for the affected record ids.
	const response = await fetch(
		`https://api.github.com/repos/${MODELS_REPOSITORY}/commits?path=publications&per_page=${limit}`,
	);
	if (!response.ok) throw new Error(`GitHub returned ${response.status} for models history`);
	const commits = (await response.json()) as ApiCommit[];
	return commits.slice(0, limit).map((commit) => {
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
 * Read up to `limit` recent publication-affecting changes to allometric/models
 * at build time. Pages checks out the models repository into
 * `.models-history`; the API fallback keeps local previews useful without
 * requiring a second checkout.
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
