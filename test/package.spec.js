import { describe, it, expect } from 'vitest';
import path from 'node:path';
import process from 'node:process';
import { execa } from 'execa';

describe('The published package', () => {
    it('can be imported by its package name', async () => {
        // Runs in a separate Node process, so the import goes through Node's
        // own resolution of package.json "exports" (via package
        // self-reference) rather than through vite's resolver.
        const { stdout } = await execa(
            process.execPath,
            [
                '--input-type=module',
                '-e',
                "const m = await import('@gebruederheitz/htmodules'); console.log(typeof m.HtModules);",
            ],
            { cwd: path.join(import.meta.dirname, '..') }
        );

        expect(stdout).toBe('function');
    });
});
