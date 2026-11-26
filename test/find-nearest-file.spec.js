import './_mocks/fs.js';
import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { vol } from 'memfs';

import { findNearestFile } from '../src/find-nearest-file.mjs';

const root = path.resolve('/srv/www');
const cwd = path.join(root, 'site', 'public');

beforeEach(() => {
    vol.reset();
});

describe('Looking up the base file', () => {
    it('finds the file in the start directory', async () => {
        vol.fromJSON({ '.htaccess': 'here', '../.htaccess': 'parent' }, cwd);

        expect(await findNearestFile('.htaccess', cwd)).toBe(
            path.join(cwd, '.htaccess')
        );
    });

    it('finds the file in a parent directory', async () => {
        vol.fromJSON({ '.htaccess': 'up', 'site/public/other': '' }, root);

        expect(await findNearestFile('.htaccess', cwd)).toBe(
            path.join(root, '.htaccess')
        );
    });

    it('skips a directory with that name', async () => {
        vol.fromJSON(
            { '.htaccess': 'up', 'site/public/.htaccess/nested': '' },
            root
        );

        expect(await findNearestFile('.htaccess', cwd)).toBe(
            path.join(root, '.htaccess')
        );
    });

    it('returns undefined when there is no such file up to the root', async () => {
        vol.fromJSON({ 'site/public/other.htaccess': '' }, root);

        expect(await findNearestFile('.htaccess', cwd)).toBeUndefined();
    });
});
