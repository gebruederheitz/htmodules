# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/htmodules` is a small CLI and library that assembles an Apache `.htaccess` (or any Apache config file) from a base file plus "module" files. It is a thin wrapper: it only discovers files and maps them to block names. The block parsing, replacing, appending and removing happens in [`@gebruederheitz/plaintextlego`](https://github.com/gebruederheitz/plaintextlego), a sibling package by the same author (a local checkout may exist at `~/projects/plaintextlego/git`). If you need to change merge behaviour, the change belongs there, not here.

Pure ESM, no build step, no transpilation: `bin/cli` imports `src/cli-autorun.mjs` directly, and the `exports` field in `package.json` points the package name at `src/index.mjs`. Anything not listed in `exports` cannot be deep-imported by consumers. The Node version is pinned in `.tool-versions` (asdf); the supported minimum is `engines` in `package.json`.

## Commands

The Taskfile (go-task) is the entry point. Each task first runs `asdf install` and `npm i`, the latter only when `package.json` or `package-lock.json` changed.

```bash
task test                # vitest run on every supported Node LTS line, one after another
task test:node NODE=24   # vitest run on one major line only
task dev                 # vitest in watch mode, on the .tool-versions Node
task lint                # eslint + prettier --check on src/ only
task release             # release-it; see below
```

`task test` loops over a `for: matrix:` of Node major versions in `Taskfile.yaml`. For each major, it runs the newest Node of that line that asdf has installed, selected through `ASDF_NODEJS_VERSION`; if none is installed, it installs `latest:<major>` first. When the supported range changes, update that matrix and `engines` in `package.json` together. The runs are sequential because the CLI tests write into the shared fixture directory.

Run a single test file or test by name, on the `.tool-versions` Node:

```bash
npx vitest run test/cli.spec.js
npx vitest run -t 'custom files'
```

Lint and Prettier only cover `src/`, not `test/`.

## How it works

`src/HtModules.mjs` contains all the logic.

1. **Base file:** the constructor argument, or else the nearest `.htaccess` found by `find-up`, searching upwards from `process.cwd()`.
2. **Modules:** every file in the base file's directory whose `path.extname` is `.htaccess`. The base `.htaccess` itself has no extension in Node's terms (it is a dotfile), so it is never picked up as a module. A custom base such as `apache.conf` is never picked up either.
3. **Block name** = `path.parse(file).name`, i.e. the filename without `.htaccess`. A leading dot is kept: `.base.htaccess` maps to `# BEGIN .base`, not `# BEGIN base`.
4. `PlainTextLego(base).run(modules)` rewrites the base file in place. It replaces an existing `# BEGIN x … # END x` block, appends the block at the end of the file if it does not exist yet, and removes the block if the module file is empty.

Behaviours to keep in mind:

- **Module files cannot be withdrawn just by deleting them.** Deleting a module file leaves its block in the target untouched. Ship an empty module file once to remove the block.
- **The constructor runs everything and does not return a promise.** `new HtModules()` starts `exec()` and moves on, so callers cannot await completion. The tests work around this by waiting a tick (`setTimeout(…, 1)`). Changing this changes the public API.
- `src/cli-autorun.mjs` reads the optional base path from `process.argv[2]`.

## Tests

- `test/index.spec.js` tests the API against an in-memory filesystem. `test/_mocks/fs.js` mocks `fs`, `fs/promises`, `node:fs` and `node:fs/promises` with `memfs`. For those mocks to reach `find-up` and `plaintextlego` inside `node_modules`, `vitest.config.mjs` inlines all dependencies (`server.deps.inline: true`). Do not remove that setting.
- `test/cli.spec.js` runs the real `bin/cli` with `execa` on the real filesystem. It copies `test/fixtures/cli/fixture` to `test/fixtures/cli/.htaccess` (gitignored), or to `nested/apache.conf` for a custom base path, and deletes the copy afterwards. `fixtures/cli/removal.htaccess` is intentionally empty and covers block removal.
- `test/package.spec.js` imports the package by its own name in a separate Node process (package self-reference), so the `exports` field is resolved by Node rather than by vite.

## Releasing

`release-it` (`.release-it.yaml`) only runs from `main`. It runs `task lint test` first, bumps the version, refreshes and commits `package-lock.json`, tags the release, publishes to npm and opens a GitHub release in the browser. Commits follow Conventional Commits (`feat!:`, `chore:`, `test:`).

## Consumers

The package is used through the CLI only. The typical call is `npx -y @gebruederheitz/htmodules@<major>` in a CI deployment job, often with deployment credentials loaded; some projects call `htmodules <base path>` from an npm script instead. Notes on specific consumer projects belong in `CLAUDE.local.md` (gitignored and npmignored), never in this file: the repository is public.

The CLI arguments, the discovery rules and the block-name mapping above are what consumers rely on. Treat changes to any of them as breaking.
