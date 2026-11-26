# htmodules

_Assemble an .htaccess file from a base file and an arbitrary number of modules_

---

This library will parse a base `.htaccess` file and attempt to
find "blocks" surrounded by `# BEGIN htmodules:${blockName}` and
`# END htmodules:${blockName}` comments. These blocks are written from separate
files ("module files"). These must be in the same directory as the base file
and follow the naming format `%blockName%.htaccess` (replacing `%blockName%`
with the module name / block name that corresponds to the `blockName` in the
comments).

On every run:

- a block with a module file gets the module file's content;
- a module file without a block is appended to the end of the base file as a
  new block;
- a block whose module file is gone is removed, and htmodules logs the removal
  to stdout. To withdraw a module, delete its file.

Blocks without the `htmodules:` prefix, such as `# BEGIN WordPress`, are never
changed or removed. If there are no module files at all but the base file
still holds `htmodules:` blocks, htmodules refuses to remove them all and
fails, unless you pass `--force` (CLI) or `{ force: true }` (API).

Upgrading from version 2? See [UPGRADING.md](UPGRADING.md).

An [example of how the files are combined](https://github.com/gebruederheitz/plaintextlego#basic-usage-replace-source-file)
as well as [a list of caveats](https://github.com/gebruederheitz/plaintextlego#caveats)
can be found [in the documentation of the underlying `@gebruederheitz/plaintextlego`
package](https://github.com/gebruederheitz/plaintextlego#readme).


## Installation

```
npm install @gebruederheitz/htmodules
```

The package ships an `npm-shrinkwrap.json`, so its dependencies are installed
at the exact versions it was released with. In CI, pin an exact version of
htmodules too (`npx -y @gebruederheitz/htmodules@<version>`): together, they
fix every package the job runs.

htmodules supports every Node.js release line that is currently in LTS (active
or maintenance), and its test suite runs on each of them. The exact minimum
version is the `engines` field in `package.json`.


## CLI Usage

```sh
# Will try to find the nearest .htaccess from the current directory upwards
$> npx htmodules

# Passing a custom base file that will be modified
$> npx htmodules ./apache-dir.conf

# Remove all htmodules blocks, even though there are no module files
$> npx htmodules --force

# or

$> ./node_modules/.bin/htmodules
```

htmodules exits with a non-zero code and writes the reason to stderr when it
cannot do its job, for instance when it finds no `.htaccess`, or when it gets
an unknown option or more than one base file. Use `--` before a base file
whose name starts with a dash.

You can use this from the node scripts in your package.json:

```json
{
  "scripts": {
    "build:htaccess": "htmodules",
    "build:apacheconf": "htmodules /var/www/mysite/public/apache-dir.conf"
  }
}
```


## API / Code Usage

```js
// ES module import
import { HtModules } from '@gebruederheitz/htmodules';

// Automatically find the nearest .htaccess upwards and modules in the same
// directory and apply the modules to the base file
await new HtModules().run();

// or provide a specific base file to work on
await new HtModules(path.resolve('./apache-dir.conf')).run();

// Remove all htmodules blocks, even though there are no module files
await new HtModules('', { force: true }).run();
```

`run()` resolves with the names of the removed blocks (without the
`htmodules:` prefix) and rejects if anything goes wrong; the base file is then
left as it was. Errors from plaintextlego carry its `code`, such as
`PTL_NO_MODULES` or `PTL_MODULE_INVALID` for a module file with a line
starting with `# BEGIN ` or `# END `.
