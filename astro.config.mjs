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
			plugins: [
				lucode({
					navLinks: [
						{ label: 'Models', link: '/models/' },
						{ label: 'Publications', link: '/publications/' },
						{ label: 'Docs', link: '/guides/example/' },
					],
				}),
			],
			sidebar: [
        {
          label: 'Introduction',
          link: '/guides/example/'
        },
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
				{
					label: 'Models',
					link: '/models/',
				},
				{
					label: 'Publications',
					link: '/publications/',
				},
				{
					label: 'Families',
					link: '/families/',
				},
			],
		}),
	],
});
