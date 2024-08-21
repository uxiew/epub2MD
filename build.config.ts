import { defineBuildConfig } from "unbuild";
import fs from 'node:fs';
import { writeFileSync } from 'write-file-safe';

export default defineBuildConfig({
    entries: [
        {
            input: "src/bin/",
            outDir: 'lib/bin/',
            format: 'cjs',
            ext: 'cjs',
            declaration: false,
        },
        {
            input: "src/",
            outDir: "lib/",
            declaration: true,
            pattern: "*.ts",
            format: "esm",
        },
        {
            input: "src/",
            pattern: "*.ts",
            declaration: true,
            outDir: "lib/",
            format: "cjs",
            ext: "cjs",
        },
    ],
    hooks: {
        "build:done"(ctx) {
            const cliDir = './lib/bin/'
            fs.readdirSync(cliDir).forEach((file) => {
                if (file.endsWith('.cjs')) {
                    const t = fs.readFileSync(cliDir + file, 'utf8').replace('// #!', '#!').replace(/require\(['"]\.{2}[^'"]*/g, (a, v) => {
                        return a + '.cjs'
                    });
                    writeFileSync(cliDir + file, t)
                }
            });
        }
    }
});