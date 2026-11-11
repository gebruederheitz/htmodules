# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/htmodules` is a small CLI and library that assembles an Apache `.htaccess` (or any Apache config file) from a base file plus "module" files. It is a thin wrapper: it only discovers files and maps them to block names. The block parsing, replacing, appending and removing happens in [`@gebruederheitz/plaintextlego`](https://github.com/gebruederheitz/plaintextlego), a sibling package by the same author (a local checkout may exist at `~/projects/plaintextlego/git`). If you need to change merge behaviour, the change belongs there, not here.

Pure ESM, no build step, no transpilation: `bin/cli` imports `src/cli-autorun.mjs` directly, and the `exports` field in `package.json` points the package name at `src/index.mjs`. Anything not listed in `exports` cannot be deep-imported by consumers. The Node version is pinned in `.tool-versions` (asdf); the supported minimum is `engines` in `package.json`.

## Commands

The Taskfile (go-task) is the entry point. Each task first runs `asdf install` and `npm i`, the latter only when `package.json` or `npm-shrinkwrap.json` changed.

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

`src/HtModules.mjs` contains the logic; `src/cli.mjs` turns the command line into a run.

1. **Base file:** the constructor argument, or else the nearest regular file named `.htaccess`, searching upwards from `process.cwd()` to the filesystem root (`src/find-nearest-file.mjs`). Directories named `.htaccess` are skipped.
2. **Modules:** every file in the base file's directory whose `path.extname` is `.htaccess`. The base `.htaccess` itself has no extension in Node's terms (it is a dotfile), so it is never picked up as a module. A custom base such as `apache.conf` is never picked up either.
3. **Block name** = `htmodules:` + `path.parse(file).name`, i.e. the filename without `.htaccess`. A leading dot is kept: `.base.htaccess` maps to `# BEGIN htmodules:.base`. The prefix is the plaintextlego `owner`: `htmodules` by default (`OWNER` in `src/HtModules.mjs`), or `--owner` / `{ owner }`. plaintextlego validates it (no whitespace, no `:`). The owner separates blocks only: discovery still picks up every module file next to the base, so independent module sets have to take turns in that directory.
4. `PlainTextLego(base).run(modules, null, { owner, force })` rewrites the base file in place. It replaces an owned block that has a module, appends a module without a block at the end of the file, and removes an owned block whose module is gone. Blocks without the prefix are foreign and never touched. `run()` logs each removed block to stdout, unless `--silent` / `{ silent: true }`, and resolves with their names. Errors go to stderr regardless.

Behaviours to keep in mind:

- **Deleting a module file removes its block** on the next run. An empty module file writes an empty block.
- **No module files at all** while the target holds `htmodules:` blocks: plaintextlego rejects with `PTL_NO_MODULES` and writes nothing, so a broken deployment cannot wipe every block. `--force` / `{ force: true }` removes them all. All of this applies per owner. The CLI adds a hint to `--force` to the error.
- plaintextlego also rejects, before writing, a module with a line starting with `# BEGIN ` or `# END ` (`PTL_MODULE_INVALID`) and an unreadable module (`PTL_MODULE_UNREADABLE`).
- **The constructor only stores its arguments.** `await new HtModules(base).run()` does the work and rejects on failure, for instance with `code: 'HTMODULES_NO_BASE_FILE'` when no `.htaccess` is found.
- **CLI:** `src/cli.mjs` parses the arguments with Node's `util.parseArgs` in strict mode (decision on gebruederheitz/htmodules#1): at most one positional base path, long options only, unknown options rejected, `--` ends the options. `main()` returns the exit code and writes errors to stderr as `htmodules: <message>`, without a stack trace, plus the usage line for argument errors. `src/cli-autorun.mjs` sets `process.exitCode` from it.

## Tests

- `test/index.spec.js` tests the API and the CLI's `main()` against an in-memory filesystem. `test/_mocks/fs.js` mocks `fs`, `fs/promises`, `node:fs` and `node:fs/promises` with `memfs`. For those mocks to reach `plaintextlego` inside `node_modules`, `vitest.config.mjs` inlines all dependencies (`server.deps.inline: true`). Do not remove that setting.
- `test/cli.spec.js` runs the real `bin/cli` with `execa` on the real filesystem. It copies `test/fixtures/cli/fixture` to `test/fixtures/cli/.htaccess` (gitignored), or to `nested/apache.conf` for a custom base path, and deletes the copy afterwards. It also checks the exit code and stderr of a failing run. The fixture's `htmodules:removal` block has no module file, which covers removal and its log line.
- `test/package.spec.js` imports the package by its own name in a separate Node process (package self-reference), so the `exports` field is resolved by Node rather than by vite.
- `test/find-nearest-file.spec.js` covers the upward lookup of the base file, also against `memfs`.

## Dependencies

`@gebruederheitz/plaintextlego` is the only runtime dependency, and it should stay that way. htmodules usually runs through `npx` in deployment jobs that have credentials loaded, so every package in its tree runs with those credentials. Prefer a few lines of code or a Node built-in over a new package.

The lockfile is `npm-shrinkwrap.json`, not `package-lock.json`. npm publishes it with the package and honours it when htmodules is installed as a dependency or through `npx`, so consumers get exactly the locked tree. A plaintextlego fix therefore reaches consumers only with an htmodules release that updates the shrinkwrap; `^` in `package.json` only matters for the next `npm i` here.

## Releasing

`release-it` (`.release-it.yaml`) only runs from `main`. It runs `task lint test` first, bumps the version, refreshes and commits `npm-shrinkwrap.json`, tags the release, publishes to npm and opens a GitHub release in the browser. Commits follow Conventional Commits (`feat!:`, `chore:`, `test:`).

## Consumers

The package is used through the CLI only. The typical call is `npx -y @gebruederheitz/htmodules@<major>` in a CI deployment job, often with deployment credentials loaded; some projects call `htmodules <base path>` from an npm script instead. Notes on specific consumer projects belong in `CLAUDE.local.md` (gitignored and npmignored), never in this file: the repository is public.

The CLI arguments, the discovery rules and the block-name mapping above are what consumers rely on. Treat changes to any of them as breaking.

Upgrading a consumer from 2.x to 3.0 needs a one-time rename of the existing blocks in every target before the first run (`# BEGIN name` → `# BEGIN htmodules:name`, same for `# END`); `UPGRADING.md` has the steps.
