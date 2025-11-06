import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { execa } from 'execa';
import { rm, cp, readFile } from 'node:fs/promises';

function p(fileName) {
    return path.join(import.meta.dirname, fileName);
}

describe('The htmodules CLI script', () => {
    const filePath = p('fixtures/cli/.htaccess');
    const nestedFilePath = path.join(
        import.meta.dirname,
        'fixtures/cli/nested/apache.conf'
    );

    afterEach(() => {
        rm(filePath, { force: true });
        rm(nestedFilePath, { force: true });
    });

    it('processes module files into a common template file', async () => {
        await cp(p('fixtures/cli/fixture'), filePath);

        await execa(p('../bin/cli'), [], {
            cwd: p('fixtures/cli'),
        });

        const fileContent = await readFile(filePath, 'utf8');
        expect(fileContent).to.contain('h4xx0rz!');
        expect(fileContent).to.contain('Appendage!');
        expect(fileContent).to.contain('"Some content in between"');
        expect(fileContent).to.contain('# This bit should remain untouched');
        expect(fileContent).not.to.contain('binary realm');
        expect(fileContent).not.to.contain('# BEGIN removal');
        expect(fileContent).not.to.contain('be here forever');
    });

    it('works on custom files and directories', async () => {
        await cp(p('fixtures/cli/fixture'), nestedFilePath);

        await execa(p('../bin/cli'), [nestedFilePath], {
            cwd: p('.'),
        });

        const fileContent = await readFile(nestedFilePath, 'utf8');
        expect(fileContent).to.contain('h4xx0rz!');
        expect(fileContent).to.contain('Appendage!');
        expect(fileContent).to.contain('"Some content in between"');
        expect(fileContent).to.contain('# This bit should remain untouched');
        expect(fileContent).not.to.contain('binary realm');
        expect(fileContent).not.to.contain('# BEGIN removal');
        expect(fileContent).not.to.contain('be here forever');
    });
});
