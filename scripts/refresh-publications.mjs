// Regenerate src/lib/publications.json, src/lib/vns.json, and
// src/lib/publications.index.json from the allometric/models repo (v4).
// Uses git protocol (not the GitHub REST API) so it is never rate-limited.
// Run: npm run refresh:models
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';

const REPO = 'allometric/models';
const REF = 'v4';
const dir = mkdtempSync(join(tmpdir(), 'models-tree-'));

const asList = (v) => (Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]);
const addUniq = (arr, v) => {
	if (v && !arr.includes(v)) arr.push(v);
};

try {
	execSync(`git clone --depth 1 --filter=blob:none --no-checkout https://github.com/${REPO} ${dir}`, {
		stdio: 'inherit',
	});
	execSync(`git -C ${dir} fetch origin ${REF}`, { stdio: 'inherit' });

	const allPaths = execSync(`git -C ${dir} ls-tree -r --name-only FETCH_HEAD`)
		.toString()
		.trim()
		.split('\n');
	const yamls = allPaths.filter((p) => /^(publications|families)\/.*\.yaml$/.test(p));
	const toEntry = (p) => ({ id: p.split('/').pop().replace(/\.yaml$/, ''), path: p });
	const sort = (a, b) => a.id.localeCompare(b.id);
	const publications = yamls.filter((p) => p.startsWith('publications/')).map(toEntry).sort(sort);
	const families = yamls.filter((p) => p.startsWith('families/')).map(toEntry).sort(sort);

	const commit = execSync(`git -C ${dir} rev-parse FETCH_HEAD`).toString().trim();

	// --- vns (needed to derive model_types / measures for the index) ---
	const components = {};
	for (const c of parse(execSync(`git -C ${dir} show FETCH_HEAD:vns/components.yaml`).toString())?.components ?? []) {
		if (c.code && c.name) components[c.code] = c.name;
	}
	const modelTypes = {};
	for (const mt of parse(execSync(`git -C ${dir} show FETCH_HEAD:vns/model_types.yaml`).toString())?.model_types ?? []) {
		if (mt.model_type) modelTypes[mt.model_type] = mt.response_name_starts ?? [];
	}
	const vnsVars = {};
	for (const path of allPaths.filter((p) => p.startsWith('vns/') && p.endsWith('.yaml'))) {
		const data = parse(execSync(`git -C ${dir} show FETCH_HEAD:${path}`).toString());
		const measure = data?.measure?.name ?? '';
		for (const v of data?.variables ?? []) {
			vnsVars[v.name] = {
				description: v.description ?? '',
				measure,
				component: v.component ? (components[v.component] ?? v.component) : '',
			};
		}
	}

	writeFileSync(
		'src/lib/publications.json',
		JSON.stringify({ ref: REF, commit, publications, families }, null, 2) + '\n',
	);
	console.log(`Wrote ${publications.length} publications, ${families.length} families (commit ${commit.slice(0, 7)}).`);
	writeFileSync(
		'src/lib/vns.json',
		JSON.stringify({ variables: vnsVars, model_types: modelTypes }, null, 2) + '\n',
	);
	console.log(`Wrote ${Object.keys(vnsVars).length} vns variables (${Object.keys(modelTypes).length} model types).`);

	// --- aggregated publication index for faceted browsing ---
	const addTaxa = (entry, taxa) => {
		if (!Array.isArray(taxa)) return;
		for (const t of taxa) {
			addUniq(entry.families, t?.family);
			addUniq(entry.genera, t?.genus);
			addUniq(entry.species, t?.species);
		}
	};
	const index = [];
	for (const pub of publications) {
		const data = parse(execSync(`git -C ${dir} show FETCH_HEAD:${pub.path}`).toString());
		const meta = data?.publication ?? {};
		const models = Array.isArray(data?.models) ? data.models : [];
		const sets = Array.isArray(data?.model_sets) ? data.model_sets : [];
		const entry = {
			id: pub.id,
			title: meta.title ?? '',
			year: meta.year ?? null,
			authors: meta.author ?? '',
			countries: asList(meta.descriptors?.country),
			regions: asList(meta.descriptors?.region),
			model_types: [],
			measures: [],
			stat_types: [],
			families: [],
			genera: [],
			species: [],
		};
		const responseVars = [];
		for (const m of models) {
			addUniq(entry.stat_types, m?.type);
			if (m?.response) for (const k of Object.keys(m.response)) responseVars.push(k);
			addTaxa(entry, m?.taxa);
		}
		for (const s of sets) {
			addUniq(entry.stat_types, s?.type);
			if (s?.response) for (const k of Object.keys(s.response)) responseVars.push(k);
			for (const spec of s?.specifications ?? []) addTaxa(entry, spec?.taxa);
		}
		for (const v of responseVars) {
			for (const [type, prefixes] of Object.entries(modelTypes)) {
				if (prefixes.some((pre) => v.startsWith(pre))) addUniq(entry.model_types, type);
			}
			const info = vnsVars[v];
			if (info?.measure) addUniq(entry.measures, info.measure);
		}
		index.push(entry);
	}
	// --- aggregated model index: one row per model and model set, across all publications ---
	const modelIndex = [];
	const pairOf = (vars) =>
		Object.entries(vars ?? {}).map(([name, unit]) => [name, typeof unit === 'string' ? unit : '']);
	for (const pub of publications) {
		const data = parse(execSync(`git -C ${dir} show FETCH_HEAD:${pub.path}`).toString());
		const meta = data?.publication ?? {};
		const pubTitle = meta.title ?? '';
		const records = [
			...(Array.isArray(data?.models) ? data.models.map((m) => ({ record: m, isSet: false })) : []),
			...(Array.isArray(data?.model_sets)
				? data.model_sets.map((s) => ({ record: s, isSet: true }))
				: []),
		];
		for (const { record, isSet } of records) {
			const response =
				record?.response && typeof record.response === 'object' ? record.response : {};
			const covariates =
				record?.covariates && typeof record.covariates === 'object' ? record.covariates : {};
			let modelType = '';
			let measure = '';
			for (const v of Object.keys(response)) {
				if (!modelType) {
					for (const [type, prefixes] of Object.entries(modelTypes)) {
						if (prefixes.some((pre) => v.startsWith(pre))) {
							modelType = type;
							break;
						}
					}
				}
				if (!measure && vnsVars[v]?.measure) measure = vnsVars[v].measure;
			}
			const taxa = isSet
				? (record?.specifications ?? []).flatMap((spec) => spec?.taxa ?? [])
				: (record?.taxa ?? []);
			const families = [];
			const genera = [];
			const species = [];
			for (const t of taxa) {
				addUniq(families, t?.family);
				addUniq(genera, t?.genus);
				addUniq(species, t?.species);
			}
			modelIndex.push({
				id: record?.name ?? '',
				pub_id: pub.id,
				pub_title: pubTitle,
				type: record?.type ?? '',
				is_set: isSet,
				model_type: modelType,
				measure,
				response: pairOf(response),
				covariates: pairOf(covariates),
				taxa_count: taxa.length,
				families,
				genera,
				species,
				countries: asList(meta.descriptors?.country),
				regions: asList(meta.descriptors?.region),
			});
		}
	}
	writeFileSync('src/lib/models.index.json', JSON.stringify(modelIndex, null, 2) + '\n');
	console.log(`Wrote ${modelIndex.length} indexed models.`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
