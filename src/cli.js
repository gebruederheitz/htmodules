const { HtModules } = require('../dist/index.js');

let baseFilePath = '';
const args = process.argv.splice(2);

if (args.length) {
    baseFilePath = args.shift();
}

new HtModules(baseFilePath);
