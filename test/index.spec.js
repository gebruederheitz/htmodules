import './_mocks/fs.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { fs, vol } from 'memfs';
import process from 'node:process';

import { base as baseFixture } from './fixtures';
import { HtModules } from '../src/index.mjs';

beforeEach(() => {
    // reset the state of in-memory fs
    vol.reset();
});

describe('The htmodules library', () => {
    it('processes module files into a common template file', async () => {
        const cwd = process.cwd();
        const filePath = path.join(cwd, '.htaccess');

        vol.fromJSON(
            {
                './.htaccess': baseFixture,
                './replaceme.htaccess': 'You have been replaced!',
                './thing.htaccess': ' Appendage.',
            },
            process.cwd()
        );

        new HtModules();

        // Wait one tick for filesystem write finish
        await new Promise((res) => setTimeout(res, 1));

        const fileContent = fs.readFileSync(filePath, 'utf8');
        expect(fileContent).to.contain('You have been replaced!');

        expect(fileContent).to.contain('Appendage.');
        expect(fileContent).to.contain('# This bit should remain untouched');
        expect(fileContent).not.to.contain('This content should be replaced');
    });

    it('has a working autorunner', async () => {
        const cwd = process.cwd();
        const filePath = path.join(cwd, '.htaccess');
        vi.stubGlobal('process', {
            argv: ['beep', 'boop'],
        });

        vol.fromJSON(
            {
                './.htaccess': baseFixture,
                './replaceme.htaccess': 'You have been replaced!',
                './thing.htaccess': ' Appendage.',
            },
            process.cwd()
        );

        await import('../src/cli-autorun.mjs');
        // Wait one tick for filesystem write finish
        await new Promise((res) => setTimeout(res, 1));

        expect(fs.readFileSync(filePath, 'utf8')).to.contain(
            'You have been replaced!'
        );
    });
});
