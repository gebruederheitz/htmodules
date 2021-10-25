# htmodules

_Assemble an .htaccess file from a base file and an arbitrary number of modules_

---

This library will parse a base `.htaccess` file and attempt to
find "blocks" surrounded by `# BEGIN ${blockName}` and `# END ${blockName}`
comments. These blocks can be replaced or appended via separate files ("module
files"). These must be in the same directory as the base file and follow the
naming format `%blockName%.htaccess` (replacing `%blockName%` with the module
name / block name that corresponds to the `blockName` in the comments).

An [example of how the files are combined](https://github.com/gebruederheitz/plaintextlego#basic-usage-replace-source-file)
as well as [a list of caveats](https://github.com/gebruederheitz/plaintextlego#caveats)
can be found [in the documentation of the underlying `@gebruederheitz/plaintextlego`
package](https://github.com/gebruederheitz/plaintextlego#readme).


## Installation

```
npm install @gebruederheitz/htmodules
```


## CLI Usage

```sh
# Will try to find the nearest .htaccess from the current directory upwards
$> npx htmodules

# Passing a custom base file that will be modified
$> npx htmodules ./apache-dir.conf

# or

$> ./node_modules/bin/htmodules
```

You can use this from the node scripts in your package.json:

```json
{
  "scripts": {
    "build:htaccess": "htmodules",
    "build:apacheconf": "htmodules /var/www/mysite/public/apache-dir.conf"
  }
}
```


## Code Usage

```js
// ES module import
import { HtModules } from '@gebruederheitz/htmodules';
// or, for CJS use (e.g. older node)
const { HtModules } = require('@gebruederheitz/htmodules');

// Automatically find the nearest .htaccess upwards and modules in the same
// directory and apply the modules to the base file
new HtModules();

// or provide a specific base file to work on
new HtModules(path.resolve('./apache-dir.conf'));
```
