// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import lucode from 'lucode-starlight';

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
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/allometric' }],
			plugins: [
				lucode({
					navLinks: [
						{ label: 'Models', link: '/models/' },
						{ label: 'Publications', link: '/publications/' },
						{ label: 'Docs', link: '/guides/introduction/' },
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
					],
				},
				{
					label: 'R Package Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
