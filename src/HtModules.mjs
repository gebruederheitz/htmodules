import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { PlainTextLego } from '@gebruederheitz/plaintextlego';
import process from 'node:process';

import { findNearestFile } from './find-nearest-file.mjs';

export class HtModules {
    /**
     * @param {string} baseFilePath The file to write the modules into. Empty:
     *        the nearest `.htaccess` from the working directory upwards.
     */
    constructor(baseFilePath = '') {
        this.baseFilePath = baseFilePath;
    }

    /**
     * Applies the module files next to the base file to the base file.
     *
     * @returns {Promise<void>}
     */
    async run() {
        const moduleFilePaths = await this.discover();
        const modules = this.createModulesObject(moduleFilePaths);
        await this.buildHtaccess(modules);
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
        await ptl.run(modules);
    }
}
