import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
    entries: [
        {
            input: "src/bin/",
            outDir: "lib/bin/",
            format: "cjs",
            ext: "cjs",
            declaration: false
        },
        {
            input: "src/",
            outDir: "lib/",
            pattern: "*.ts",
            format: "esm",
        },
        {
            input: "src/",
            pattern: "*.ts",
            outDir: "lib/",
            format: "cjs",
            ext: "cjs",
        },
    ],
    declaration: true,
    rollup: {
        emitCJS: true
    },
});