# Upgrading

## From 2.x to 3.0

Version 3 builds on `@gebruederheitz/plaintextlego` 3. htmodules now owns
the blocks it writes through a prefix. A block belongs to htmodules exactly
when its name starts with `htmodules:` (`# BEGIN htmodules:redirects`). Every
other block is foreign and is never changed or removed. A block is removed
when its module file is gone.

### 1. Rename the blocks your module files manage

Before the first run with version 3, every existing block that has a module
file needs the prefix, in every base file:

```diff
-# BEGIN redirects
+# BEGIN htmodules:redirects
 …
-# END redirects
+# END htmodules:redirects
```

This loop renames exactly the blocks that have a module file next to the
base file and leaves all other blocks alone. Run it in the base file's
directory, after any step that copies module files there:

```sh
for module in *.htaccess .*.htaccess; do
    [ -f "$module" ] || continue
    NAME="${module%.htaccess}" perl -pi -e \
        's/^# (BEGIN|END) \Q$ENV{NAME}\E$/# $1 htmodules:$ENV{NAME}/' .htaccess
done
```

Replace `.htaccess` at the end of the `perl` line with your base file if you
pass a custom one. If you pass `--owner`, use `<owner>:` instead of
`htmodules:`.

The loop is idempotent: renamed blocks no longer match. So a deployment job
can run it right before htmodules for the first deployment with version 3,
and the loop can be dropped afterwards.

If you skip the rename, the old blocks become foreign: every module is
appended as a new block and the old block stays, so its content appears
twice. Delete the old blocks by hand to recover.

### 2. Remove blocks by deleting their module file

|                                         | 2.x               | 3.0                     |
| --------------------------------------- | ----------------- | ----------------------- |
| `htmodules:` block, module file deleted | kept              | **removed**, and logged |
| Empty module file                       | removes the block | writes an empty block   |

- **Empty module files:** if you kept empty module files to remove blocks,
  delete them before the first run. Their blocks were already removed by
  2.x, so the rename loop leaves nothing behind for them.
- **Blocks without a module file:** after the rename, each `htmodules:`
  block whose module file you no longer have is removed on the next run.
  The loop above only renames blocks that have a module file, so blocks
  without one stay foreign and are kept, as they were in 2.x.

htmodules logs every removed block to stdout, so a block that goes missing by
accident shows up in the CI log. `--silent` turns the log off.

### 3. Expect a failing run where 2.x carried on

The CLI now exits with code 1 and writes `htmodules: <reason>` to stderr when
it cannot do its job. The base file is then left as it was.

| Cause                                                                                                    | In 2.x                                                                  |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| No module files at all, but the base file holds `htmodules:` blocks. Pass `--force` to remove them all.  | Nothing happened.                                                       |
| A module file has a line starting with `# BEGIN ` or `# END `. Reword that comment line.                 | Accepted; the next run broke the file.                                  |
| A module file cannot be read.                                                                            | The module was skipped.                                                 |
| No `.htaccess` found from the working directory upwards.                                                 | An unhandled error with a stack trace.                                  |
| An unknown option or more than one base file. Put `--` before a base file whose name starts with a dash. | The first argument was taken as the base file, any others were ignored. |

### 4. New options

- `--force`: remove all of the owner's blocks even when there are no module
  files.
- `--owner <name>`: use another block prefix than `htmodules`, for instance
  to maintain one target from independent sets of module files, one run
  after another.
- `--silent`: do not log removed blocks. Errors are still reported.

### API

`new HtModules()` no longer starts the run. Call and await `run()`, which
replaces `exec()`, and pass the options as the second argument:

```diff
-new HtModules(baseFile);
+const removed = await new HtModules(baseFile, { force, owner, silent }).run();
```

`run()` resolves with the names of the removed blocks, without the prefix,
and rejects on the failures listed above. Errors from plaintextlego carry its
`code` (`PTL_NO_MODULES`, `PTL_MODULE_INVALID`, `PTL_MODULE_UNREADABLE`); a
missing base file has `code: 'HTMODULES_NO_BASE_FILE'`.

### Output changes

plaintextlego 3 also writes slightly different output on the first run. For
instance, appended blocks lose the blank lines inside them, and removing a
block also removes the blank line before it. Its
[upgrade guide](https://github.com/gebruederheitz/plaintextlego/blob/main/UPGRADING.md#output-changes)
has the details. After that first run, repeated runs give the same file.

### Pin the version in CI

htmodules now ships an `npm-shrinkwrap.json`, so its dependencies install at
the versions it was released with. Pin an exact htmodules version in
deployment jobs (`npx -y @gebruederheitz/htmodules@<version>`) to fix the
whole tree.

## From 1.x to 2.0

- Node 22 or later is required. The minimum is the `engines` field in
  `package.json`.
- The package is an ES module only. The CLI is unchanged.
- An empty module file removes its block (through plaintextlego 1.3). In
  version 3 this changes again: delete the module file instead (see above).

To go from 1.x straight to 3.0, follow both sections.
