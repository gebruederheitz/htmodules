import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        server: {
            // We're mocking the filesystem, and using a dependency to proxy-read
            // the filesystem -- that dependency (and its dependencies) needs to
            // be inlined by vite(st), so it can perform its mocking mechanism
            // on the those modules and replace Node's native "fs"/"fs/promises".
            deps: {
                // inline: ['find-up'],
                inline: true,
            },
        },
    },
});
