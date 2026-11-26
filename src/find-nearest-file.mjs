import path from 'node:path';
import { stat } from 'node:fs/promises';

/**
 * Looks for a regular file named `fileName` in `startDir` and then in each
 * parent directory up to the filesystem root. Symlinks are followed;
 * directories and anything that cannot be read are skipped.
 *
 * @param {string} fileName
 * @param {string} startDir
 * @returns {Promise<string|undefined>} The absolute path of the nearest match.
 */
export async function findNearestFile(fileName, startDir) {
    let dir = path.resolve(startDir);

    for (;;) {
        const candidate = path.join(dir, fileName);
        if (await isFile(candidate)) {
            return candidate;
        }

        const parent = path.dirname(dir);
        if (parent === dir) {
            return undefined;
        }
        dir = parent;
    }
}

async function isFile(filePath) {
    try {
        return (await stat(filePath)).isFile();
    } catch {
        return false;
    }
}
