// allometric/models repository constants and helpers.
// Module-scoped so both page render bodies and getStaticPaths can use them
// (frontmatter locals are render-scoped in Astro and invisible to getStaticPaths).
import { parse } from 'yaml';
import cached from './publications.json';

export const REPO = 'allometric/models';
export const REF = 'v4';
export const PUB_PREFIX = 'publications/';
export const FAMILY_PREFIX = 'families/';
// The snapshot commit the site is rendered against (captured at refresh time).
export const COMMIT = cached.commit ?? REF;

export interface PubEntry {
	/** record key, e.g. `barnes_1962` */
	id: string;
	/** repo path, e.g. `publications/a_e/barnes_1962.yaml` */
	path: string;
	/** human-readable title, populated only when explicitly enriched */
	title?: string;
}

/**
 * Enumerate YAML records under a repo prefix via the GitHub trees API.
 * Only called on an explicit refresh (`MODELS_REFRESH=1`): the GitHub API is
 * rate-limited to 60 req/hr/IP unauthenticated, so builds must not depend on it.
 */
async function listCollectionFromApi(prefix: string): Promise<PubEntry[]> {
	const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/${REF}?recursive=1`;
	let yamls: string[] = [];
	try {
		const res = await fetch(treeUrl, {
			headers: { accept: 'application/vnd.github+json', 'user-agent': 'allometric-site' },
		});
		if (res.ok) {
			const tree = await res.json();
			yamls = (tree.tree ?? [])
				.map((entry: { path: string }) => entry.path)
				.filter((path) => path.startsWith(prefix) && path.endsWith('.yaml'));
		}
	} catch (error) {
		console.error(`[${prefix}] failed to list repo tree:`, error);
	}

	// key (file basename) -> repo path. Basenames are unique across
	// subdirectories in this repo; warn on any future collision.
	const byId = new Map<string, string>();
	for (const path of yamls) {
		const id = path.split('/').pop()!.replace(/\.yaml$/, '');
		if (byId.has(id)) {
			console.warn(`[${prefix}] duplicate id "${id}": ${byId.get(id)} and ${path}`);
		} else {
			byId.set(id, path);
		}
	}

	return [...byId]
		.map(([id, path]) => ({ id, path }))
		.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The enumeration is cached in `publications.json` (generated from the repo
 * tree) so builds never depend on the rate-limited GitHub REST API. Set
 * `MODELS_REFRESH=1` to re-enumerate from the API and pick up new records.
 */
export async function listPublications(): Promise<PubEntry[]> {
	if (import.meta.env.MODELS_REFRESH === '1') {
		const fresh = await listCollectionFromApi(PUB_PREFIX);
		if (fresh.length > 0) return fresh;
	}
	return cached.publications;
}

export async function listFamilies(): Promise<PubEntry[]> {
	if (import.meta.env.MODELS_REFRESH === '1') {
		const fresh = await listCollectionFromApi(FAMILY_PREFIX);
		if (fresh.length > 0) return fresh;
	}
	return cached.families;
}

/**
 * Read each record's title from its YAML (raw.githubusercontent.com — a CDN
 * with no API rate limit). Called only where titles are needed, e.g. a listing
 * page, at build time. Fetch/parse failures keep the entry title-less rather
 * than failing the build.
 */
export async function enrichWithTitles(
	entries: PubEntry[],
	titleOf: (data: unknown) => unknown,
): Promise<PubEntry[]> {
	return Promise.all(
		entries.map(async (entry) => {
			try {
				const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${COMMIT}/${entry.path}`);
				if (!res.ok) return entry;
				const title = titleOf(parse(await res.text()));
				return typeof title === 'string' && title.length > 0 ? { ...entry, title } : entry;
			} catch {
				return entry;
			}
		}),
	);
}
