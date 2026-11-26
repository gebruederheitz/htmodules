import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        server: {
            // We're mocking the filesystem, and plaintextlego reads and writes
            // the files -- that dependency needs to be inlined by vite(st), so
            // it can perform its mocking mechanism on it and replace Node's
            // native "fs"/"fs/promises".
            deps: {
                inline: true,
            },
        },
    },
});
