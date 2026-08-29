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
			description: 'Documentation for Allometric.',
			plugins: [
				lucode({
					navLinks: [
						{ label: 'Publications', link: '/publications/' },
						{ label: 'Families', link: '/families/' },
						{ label: 'Docs', link: '/guides/example/' },
					],
				}),
			],
			sidebar: [
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
