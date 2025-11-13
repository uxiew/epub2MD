import { defineBuildConfig } from "unbuild";
import fs from 'node:fs';

export default defineBuildConfig({
    entries: [
        {
            input: "src/",
            outDir: "lib/",
            pattern: "**/*.ts",
            declaration: true,
            format: "esm",
        },
        {
            input: "src/",
            outDir: "lib/",
            pattern: "**/*.ts",
            declaration: true,
            format: "cjs",
            ext: "cjs",
        },
    ],
    hooks: {
        "build:done"(ctx) {
            const cliDir = './lib/bin/'
            fs.readdirSync(cliDir).forEach((file) => {
                if (file.match(/.(mjs|ts)$/)) {
                    fs.rmSync(cliDir + file)
                }
            });
        }
    }
});
