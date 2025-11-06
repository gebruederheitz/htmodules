import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { execa } from 'execa';
import { rm, cp, readFile } from 'node:fs/promises';

describe('The htmodules CLI script', () => {
    const filePath = path.join(import.meta.dirname, 'fixtures/cli/.htaccess');

    afterEach(() => {
        rm(filePath);
    });

    it('processes module files into a common template file', async () => {
        await cp(
            path.join(import.meta.dirname, 'fixtures/cli/fixture'),
            path.join(import.meta.dirname, 'fixtures/cli/.htaccess')
        );

        await execa(path.join(import.meta.dirname, '../bin/cli'), [], {
            cwd: path.join(import.meta.dirname, 'fixtures/cli'),
        });

        const fileContent = await readFile(filePath, 'utf8');
        expect(fileContent).to.contain('You have been replaced!');
        expect(fileContent).to.contain('Appendage!');
        expect(fileContent).to.contain('"Some content in between"');
        expect(fileContent).to.contain('# This bit should remain untouched');
        expect(fileContent).not.to.contain('# BEGIN removal');
        expect(fileContent).not.to.contain('be here forever');
    });
});
