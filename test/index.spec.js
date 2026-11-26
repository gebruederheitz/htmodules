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

    it('writes its blocks with the htmodules prefix and leaves other blocks alone', async () => {
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            {
                './.htaccess': '# BEGIN thing\nforeign\n# END thing\n',
                './thing.htaccess': 'owned\n',
            },
            process.cwd()
        );

        await new HtModules().run();

        expect(fs.readFileSync(filePath, 'utf8')).toBe(
            '# BEGIN thing\nforeign\n# END thing\n\n' +
                '# BEGIN htmodules:thing\nowned\n# END htmodules:thing\n'
        );
    });

    it('removes and logs the blocks whose module file is gone', async () => {
        const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            {
                './.htaccess':
                    'top\n\n# BEGIN htmodules:old\ngone\n# END htmodules:old\n',
                './new.htaccess': 'fresh\n',
            },
            process.cwd()
        );

        expect(await new HtModules().run()).toEqual(['old']);

        const fileContent = fs.readFileSync(filePath, 'utf8');
        expect(fileContent).not.to.contain('htmodules:old');
        expect(fileContent).to.contain('# BEGIN htmodules:new');
        expect(stdout).toHaveBeenCalledTimes(1);
        expect(stdout).toHaveBeenCalledWith(
            `Removed block "htmodules:old" from ${filePath}: there is no old.htaccess next to it.`
        );
    });

    it('does not log the removed blocks when silent', async () => {
        const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
        vol.fromJSON(
            {
                './.htaccess': '# BEGIN htmodules:old\ngone\n# END htmodules:old\n',
                './new.htaccess': 'fresh\n',
            },
            process.cwd()
        );

        expect(await new HtModules('', { silent: true }).run()).toEqual([
            'old',
        ]);
        expect(stdout).not.toHaveBeenCalled();
    });

    it('refuses to remove all its blocks when there are no module files', async () => {
        const filePath = path.join(process.cwd(), '.htaccess');
        const base = '# BEGIN htmodules:old\nkept\n# END htmodules:old\n';
        vol.fromJSON({ './.htaccess': base }, process.cwd());

        await expect(new HtModules().run()).rejects.toMatchObject({
            code: 'PTL_NO_MODULES',
        });
        expect(fs.readFileSync(filePath, 'utf8')).toBe(base);
    });

    it('removes all its blocks without module files when forced', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            {
                './.htaccess':
                    'top\n\n# BEGIN htmodules:old\nkept\n# END htmodules:old\n',
            },
            process.cwd()
        );

        expect(await new HtModules('', { force: true }).run()).toEqual([
            'old',
        ]);
        expect(fs.readFileSync(filePath, 'utf8')).toBe('top\n');
    });

    it('leaves the blocks of another owner alone', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const cwd = process.cwd();
        const filePath = path.join(cwd, '.htaccess');
        vol.fromJSON(
            { './.htaccess': 'top\n', './one.htaccess': 'first set\n' },
            cwd
        );
        await new HtModules('', { owner: 'deploy' }).run();

        // A second, independent set of module files, applied with its own owner.
        vol.unlinkSync(path.join(cwd, 'one.htaccess'));
        vol.writeFileSync(path.join(cwd, 'two.htaccess'), 'second set\n');
        expect(await new HtModules('', { owner: 'host' }).run()).toEqual([]);

        // The first set again: its owner's block stays, the other one too.
        vol.unlinkSync(path.join(cwd, 'two.htaccess'));
        vol.writeFileSync(path.join(cwd, 'one.htaccess'), 'first set, v2\n');
        expect(await new HtModules('', { owner: 'deploy' }).run()).toEqual([]);

        expect(fs.readFileSync(filePath, 'utf8')).toBe(
            'top\n\n' +
                '# BEGIN deploy:one\nfirst set, v2\n# END deploy:one\n\n' +
                '# BEGIN host:two\nsecond set\n# END host:two\n'
        );
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

    it('writes the blocks with the owner given by --owner', async () => {
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            { './.htaccess': '', './thing.htaccess': 'owned\n' },
            process.cwd()
        );

        expect(await main(['--owner', 'site'])).toBe(0);
        expect(fs.readFileSync(filePath, 'utf8')).toBe(
            '# BEGIN site:thing\nowned\n# END site:thing\n'
        );
    });

    it.each([[['--owner=']], [['--owner=a b']], [['--owner=a:b']]])(
        'rejects the invalid owner in %j',
        async (args) => {
            vol.fromJSON(
                { './.htaccess': '', './thing.htaccess': 'owned\n' },
                process.cwd()
            );

            expect(await main(args)).toBe(1);
            expect(stderr).toHaveBeenCalledWith(
                expect.stringMatching(/^htmodules: Invalid owner /)
            );
        }
    );

    it('rejects --owner without a value with usage', async () => {
        expect(await main(['--owner'])).toBe(1);
        expect(stderr).toHaveBeenCalledWith(
            expect.stringMatching(/^Usage: htmodules/)
        );
    });

    it.each([
        [[], 1],
        [['--silent'], 0],
    ])('logs the removed blocks with %j %i times', async (args, times) => {
        const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
        vol.fromJSON(
            {
                './.htaccess': '# BEGIN htmodules:old\ngone\n# END htmodules:old\n',
                './new.htaccess': 'fresh\n',
            },
            process.cwd()
        );

        expect(await main(args)).toBe(0);
        expect(stdout).toHaveBeenCalledTimes(times);
    });

    it('still reports errors with --silent', async () => {
        expect(await main(['--silent'])).toBe(1);
        expect(stderr).toHaveBeenCalledWith(
            expect.stringMatching(/^htmodules: No \.htaccess found in /)
        );
    });

    it('fails without module files and points to --force', async () => {
        vol.fromJSON(
            { './.htaccess': '# BEGIN htmodules:old\nkept\n# END htmodules:old\n' },
            process.cwd()
        );

        expect(await main([])).toBe(1);
        expect(stderr).toHaveBeenCalledWith(
            expect.stringContaining('Run with --force')
        );
    });

    it('removes all its blocks without module files with --force', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const filePath = path.join(process.cwd(), '.htaccess');
        vol.fromJSON(
            { './.htaccess': '# BEGIN htmodules:old\nkept\n# END htmodules:old\n' },
            process.cwd()
        );

        expect(await main(['--force'])).toBe(0);
        expect(fs.readFileSync(filePath, 'utf8')).toBe('');
    });
});
