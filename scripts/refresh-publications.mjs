// Regenerate src/lib/publications.json and src/lib/vns.json from the
// allometric/models repo (v4). Uses git protocol (not the GitHub REST API)
// so it is never rate-limited. Run: npm run refresh:models
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';

const REPO = 'allometric/models';
const REF = 'v4';
const dir = mkdtempSync(join(tmpdir(), 'models-tree-'));

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

	writeFileSync(
		'src/lib/publications.json',
		JSON.stringify({ ref: REF, publications, families }, null, 2) + '\n',
	);
	console.log(`Wrote ${publications.length} publications, ${families.length} families.`);

	// vns variable naming system, bundled for client-side tooltips and titles.
	const components = {};
	const compData = parse(execSync(`git -C ${dir} show FETCH_HEAD:vns/components.yaml`).toString());
	for (const c of compData?.components ?? []) {
		if (c.code && c.name) components[c.code] = c.name;
	}
	const modelTypes = {};
	const mtData = parse(execSync(`git -C ${dir} show FETCH_HEAD:vns/model_types.yaml`).toString());
	for (const mt of mtData?.model_types ?? []) {
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
		'src/lib/vns.json',
		JSON.stringify({ variables: vnsVars, model_types: modelTypes }, null, 2) + '\n',
	);
	console.log(`Wrote ${Object.keys(vnsVars).length} vns variables (${Object.keys(modelTypes).length} model types).`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
