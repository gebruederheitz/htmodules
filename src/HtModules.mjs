import path from 'path';
import { readdir } from 'fs/promises';
import { PlainTextLego } from '@gebruederheitz/plaintextlego';
import findUp from 'find-up';

export class HtModules {
    constructor(baseFilePath = '') {
        this.baseFilePath = baseFilePath;
        this.exec().then();
    }

    async exec() {
        const moduleFilePaths = await this.discover();
        const modules = this.createModulesObject(moduleFilePaths);
        await this.buildHtaccess(modules);
    }

    async discover() {
        if (!this.baseFilePath) {
            this.baseFilePath = await findUp('.htaccess');
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
