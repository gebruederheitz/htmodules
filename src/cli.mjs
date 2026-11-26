import process from 'node:process';
import { parseArgs } from 'node:util';

import { HtModules, OWNER } from './HtModules.mjs';

export const USAGE =
    'Usage: htmodules [--owner <name>] [--force] [--] [base file]';

/**
 * @param {string[]} args The command line arguments, without node and the script.
 * @returns {{baseFilePath: string, options: {owner: string, force: boolean}}}
 */
export function parseCliArgs(args) {
    let parsed;
    try {
        parsed = parseArgs({
            args,
            strict: true,
            allowPositionals: true,
            options: {
                owner: { type: 'string', default: OWNER },
                force: { type: 'boolean', default: false },
            },
        });
    } catch (cause) {
        throw usageError(cause.message, cause);
    }

    const { values, positionals } = parsed;
    if (positionals.length > 1) {
        throw usageError(
            `Expected at most one base file, got ${positionals.length}: ${positionals.join(' ')}`
        );
    }

    return {
        baseFilePath: positionals[0] ?? '',
        options: { owner: values.owner, force: values.force },
    };
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
        const { baseFilePath, options } = parseCliArgs(args);
        await new HtModules(baseFilePath, options).run();
        return 0;
    } catch (error) {
        console.error(`htmodules: ${error.message}`);
        if (error.code === 'HTMODULES_USAGE') {
            console.error(USAGE);
        }
        if (error.code === 'PTL_NO_MODULES') {
            console.error(
                'No module files found. Run with --force to remove them all.'
            );
        }
        return 1;
    }
}

function usageError(message, cause = undefined) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.code = 'HTMODULES_USAGE';
    return error;
}
