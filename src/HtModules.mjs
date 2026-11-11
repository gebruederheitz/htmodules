import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { PlainTextLego } from '@gebruederheitz/plaintextlego';
import process from 'node:process';

import { findNearestFile } from './find-nearest-file.mjs';

/**
 * The prefix of every block htmodules writes: `# BEGIN htmodules:<name>`.
 * Blocks without it are never changed or removed.
 */
export const OWNER = 'htmodules';

/**
 * @typedef {object} HtModulesOptions
 * @property {boolean} [force] Remove all htmodules blocks even if there is
 *           no module file at all. Without it, such a run is rejected.
 */

export class HtModules {
    /**
     * @param {string} baseFilePath The file to write the modules into. Empty:
     *        the nearest `.htaccess` from the working directory upwards.
     * @param {HtModulesOptions} options
     */
    constructor(baseFilePath = '', { force = false } = {}) {
        this.baseFilePath = baseFilePath;
        this.force = force;
    }

    /**
     * Applies the module files next to the base file to the base file, and
     * removes the blocks whose module file is gone. Each removed block is
     * logged to stdout.
     *
     * @returns {Promise<string[]>} The names of the removed blocks, without the owner prefix.
     */
    async run() {
        const moduleFilePaths = await this.discover();
        const modules = this.createModulesObject(moduleFilePaths);
        const removed = await this.buildHtaccess(modules);
        removed.forEach((name) => this.logRemoved(name));
        return removed;
    }

    async discover() {
        if (!this.baseFilePath) {
            this.baseFilePath = await this.findBaseFile();
        }
        const baseDir = path.dirname(this.baseFilePath);
        const fileList = await readdir(baseDir);
        const filtered = fileList.filter(
            (filename) => path.extname(filename) === '.htaccess'
        );
        return filtered.map((fileName) => {
            return path.resolve(baseDir, fileName);
        });
    }

    async findBaseFile() {
        const cwd = process.cwd();
        const found = await findNearestFile('.htaccess', cwd);
        if (!found) {
            const error = new Error(
                `No .htaccess found in ${cwd} or any directory above it. Pass the base file's path.`
            );
            error.code = 'HTMODULES_NO_BASE_FILE';
            throw error;
        }
        return found;
    }

    createModulesObject(filePaths = []) {
        let result = {};

        filePaths.forEach((fileName) => {
            const parsedPath = path.parse(fileName);
            const moduleName = parsedPath.name;

            result[moduleName] = fileName;
        });

        return result;
    }

    async buildHtaccess(modules) {
        const ptl = new PlainTextLego(this.baseFilePath);
        return await ptl.run(modules, null, {
            owner: OWNER,
            force: this.force,
        });
    }

    logRemoved(name) {
        console.log(
            `Removed block "${OWNER}:${name}" from ${this.baseFilePath}: there is no ${name}.htaccess next to it.`
        );
    }
}
