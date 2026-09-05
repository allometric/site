# Starlight Starter Kit: Basics

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

```
npm create astro@latest -- --template starlight
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   └── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## ORC documentation

The ORC documentation is rendered by this site with Starlight. The ORC
repository is tracked as a pinned submodule at `vendor/orc/`, while the five
published Markdown pages are symlinked into `src/content/docs/orc/` so the
Starlight loader does not ingest the ORC repository's root README or metadata.
Initialize it after cloning:

```sh
git submodule update --init --recursive
```

When ORC documentation changes land in the `allometric/orc` repository, update
the published revision from this repository and commit the submodule pointer:

```sh
git -C vendor/orc fetch origin main
git -C vendor/orc checkout origin/main
git add vendor/orc src/content/docs/orc
git commit -m "docs: update ORC documentation"
```

The site Pages workflow checks out submodules recursively, so a missing
submodule must be fixed before running the site build.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
