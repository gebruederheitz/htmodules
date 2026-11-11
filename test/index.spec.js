import './_mocks/fs.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fs, vol } from 'memfs';
import process from 'node:process';

import { base as baseFixture } from './fixtures';
import { HtModules } from '../src/index.mjs';
import { main } from '../src/cli.mjs';

beforeEach(() => {
    // reset the state of in-memory fs
    vol.reset();
});

afterEach(() => {
    vi.resetAllMocks();
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

        await new HtModules().run();

        const fileContent = fs.readFileSync(filePath, 'utf8');
        expect(fileContent).to.contain('You have been replaced!');

        expect(fileContent).to.contain('Appendage.');
        expect(fileContent).to.contain('# This bit should remain untouched');
        expect(fileContent).not.to.contain('This content should be replaced');
    });

    it('rejects when there is no base file', async () => {
        await expect(new HtModules().run()).rejects.toMatchObject({
            code: 'HTMODULES_NO_BASE_FILE',
        });
    });
});

describe('The htmodules CLI', () => {
    let stderr;

    beforeEach(() => {
        stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('processes the modules and exits with 0', async () => {
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            {
                './.htaccess': baseFixture,
                './replaceme.htaccess': 'You have been replaced!',
            },
            process.cwd()
        );

        expect(await main([])).toBe(0);
        expect(fs.readFileSync(filePath, 'utf8')).to.contain(
            'You have been replaced!'
        );
        expect(stderr).not.toHaveBeenCalled();
    });

    it('takes the base file as its only argument', async () => {
        const filePath = path.join(process.cwd(), 'conf', 'apache.conf');
        vol.fromJSON(
            {
                './conf/apache.conf': baseFixture,
                './conf/replaceme.htaccess': 'You have been replaced!',
            },
            process.cwd()
        );

        expect(await main(['--', filePath])).toBe(0);
        expect(fs.readFileSync(filePath, 'utf8')).to.contain(
            'You have been replaced!'
        );
    });

    it.each([
        [['--bogus'], "Unknown option '--bogus'"],
        [['a', 'b'], 'Expected at most one base file, got 2: a b'],
    ])('rejects the arguments %j with usage', async (args, message) => {
        expect(await main(args)).toBe(1);
        expect(stderr).toHaveBeenCalledWith(
            expect.stringContaining(message)
        );
        expect(stderr).toHaveBeenCalledWith(
            expect.stringMatching(/^Usage: htmodules/)
        );
    });

    it('reports a failing run without a stack trace', async () => {
        expect(await main([])).toBe(1);
        expect(stderr).toHaveBeenCalledTimes(1);
        expect(stderr).toHaveBeenCalledWith(
            expect.stringMatching(/^htmodules: No \.htaccess found in /)
        );
    });
});
