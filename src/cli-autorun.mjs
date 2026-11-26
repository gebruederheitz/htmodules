import process from 'node:process';

import { main } from './cli.mjs';

main().then((exitCode) => {
    process.exitCode = exitCode;
});
