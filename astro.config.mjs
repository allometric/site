import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import lucode from 'lucode-starlight';
import { readFileSync } from 'node:fs';

// The allometric R package is vendored as a git submodule; its generated
// reference pages (docs/reference/*.md) drive this sidebar section.
function loadRReferenceSidebar() {
	try {
		const url = new URL('./vendor/allometric/docs/reference/_index.json', import.meta.url);
		const manifest = JSON.parse(readFileSync(url, 'utf8'));
		return manifest.groups
			.filter((group) => group.label !== 'Overview')
			.map((group) => ({
				label: group.label,
				items: group.items.map((item) => ({
					label: item.name === 'allometric-package' || item.name.includes('-method')
						? item.title
						: item.name,
					link: `/reference/${item.slug}/`,
				})),
			}));
	} catch (err) {
		console.warn('[astro.config] vendor/allometric submodule not initialized; skipping R Package sidebar:', err.message);
		return [];
	}
}

// https://astro.build/config
export default defineConfig({
	site: 'https://allometric.org',
	integrations: [
		starlight({
			title: 'allometric',
			description: 'allometric models and documentation',
			components: {
				// Strip the default favicon link: the site ships no favicon.
				Head: './src/components/Head.astro',
			},
			customCss: ['./src/styles/starlight.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/allometric' }],
			plugins: [
				lucode({
					navLinks: [
						{ label: 'Models', link: '/models/' },
						{ label: 'Publications', link: '/publications/' },
						{ label: 'Latest changes', link: '/changes/' },
						{ label: 'Introduction', link: '/guides/introduction/' },
					],
				}),
			],
			sidebar: [
        {
          label: 'Introduction',
          link: '/guides/introduction/'
        },
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Contributing Models', slug: 'guides/contributing' },
						{ label: 'Using Models', slug: 'guides/using-models' },
					],
				},
				{
					label: 'R Package',
					items: [
						{
							label: 'Package overview',
							items: [
								{ label: 'The allometric Package', link: '/reference/r-allometric/' },
								{ label: 'Getting Started', link: '/reference/example/' },
							],
						},
						...loadRReferenceSidebar(),
					],
				},
				{
					label: 'ORC',
					items: [
						{ label: 'Home', link: '/orc/' },
						{
							label: 'Schema',
							items: [
								{ label: 'Publication', slug: 'orc/publication' },
								{ label: 'Model Families', slug: 'orc/families' },
							],
						},
						{ label: 'Model kinds', slug: 'orc/kinds' },
						{ label: 'API', slug: 'orc/api' },
					],
				},
			],
		}),
	],
});
