import { HtModules } from './HtModules.mjs';
import process from 'node:process';

let baseFilePath = '';
const args = process.argv.splice(2);

if (args.length) {
    baseFilePath = args.shift();
}

new HtModules(baseFilePath);
