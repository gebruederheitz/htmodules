import process from 'node:process';
import { parseArgs } from 'node:util';

import { HtModules } from './HtModules.mjs';

export const USAGE = 'Usage: htmodules [--] [base file]';

/**
 * @param {string[]} args The command line arguments, without node and the script.
 * @returns {{baseFilePath: string}}
 */
export function parseCliArgs(args) {
    let parsed;
    try {
        parsed = parseArgs({
            args,
            strict: true,
            allowPositionals: true,
            options: {},
        });
    } catch (cause) {
        throw usageError(cause.message, cause);
    }

    const { positionals } = parsed;
    if (positionals.length > 1) {
        throw usageError(
            `Expected at most one base file, got ${positionals.length}: ${positionals.join(' ')}`
        );
    }

    return { baseFilePath: positionals[0] ?? '' };
}

/**
 * Runs htmodules for the given command line arguments. Errors are written to
 * stderr instead of being thrown.
 *
 * @param {string[]} args The command line arguments, without node and the script.
 * @returns {Promise<number>} The exit code.
 */
export async function main(args = process.argv.slice(2)) {
    try {
        const { baseFilePath } = parseCliArgs(args);
        await new HtModules(baseFilePath).run();
        return 0;
    } catch (error) {
        console.error(`htmodules: ${error.message}`);
        if (error.code === 'HTMODULES_USAGE') {
            console.error(USAGE);
        }
        return 1;
    }
}

function usageError(message, cause = undefined) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.code = 'HTMODULES_USAGE';
    return error;
}
