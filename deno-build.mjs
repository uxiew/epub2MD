// source from: https://github.com/colinhacks/zod/blob/main/deno-build.mjs
// Although this script generates code for use in Deno, this script itself is// written for Node so that contributors do not need to install Deno to build.
// @ts-check

import {
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from "fs";
import { dirname } from "path";

// Node's path.join() normalize explicitly-relative paths like "./index.ts" to
// paths like "index.ts" which don't work as relative ES imports, so we do this.
const join = (/** @type string[] */ ...parts) =>
    parts.join("/").replace(/\/\//g, "/");

// const targetFilesReg = /(?<!\.spec)\.ts$/

const projectRoot = process.cwd();
const nodeSrcRoot = join(projectRoot, "src");
const denoLibRoot = join(projectRoot, "dist");

const walkAndBuild = (/** @type string */ dir) => {
    for (const entry of readdirSync(join(nodeSrcRoot, dir), {
        withFileTypes: true,
        encoding: "utf-8",
    })) {
        if (entry.isDirectory()) {
            walkAndBuild(join(dir, entry.name));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
            const nodePath = join(nodeSrcRoot, dir, entry.name);
            const denoPath = join(denoLibRoot, dir, entry.name);

            if (/\.spec\.ts$/.test(nodePath)) {
                // console.log(`Skipping ${nodePath}`);
                continue;
            }

            const nodeSource = readFileSync(nodePath, { encoding: "utf-8" });

            const denoSource = nodeSource.replace(
                /^(?:import|export)[\s\S]*?from\s*['"]([^'"]*)['"];?$/gm,
                (line, target) => {

                    const targetNodePath = join(dirname(nodePath), target);
                    const targetNodePathIfFile = targetNodePath + ".ts";
                    const targetNodePathIfDir = join(targetNodePath, "index.ts");

                    console.log(line, "target：" + target, targetNodePath);

                    try {
                        if (statSync(targetNodePathIfFile)?.isFile()) {
                            return line.replace(target, target + ".ts");
                        }
                    } catch (error) {
                        if (error?.code !== "ENOENT") {
                            throw error;
                        }
                    }

                    try {
                        if (statSync(targetNodePathIfDir)?.isFile()) {
                            return line.replace(target, join(target, "index.ts"));
                        }
                    } catch (error) {
                        if (error?.code !== "ENOENT") {
                            throw error;
                        }
                    }

                    // console.warn(`Skipping non-resolvable import:\n  ${line}`);
                    return line;
                }
            );

            mkdirSync(dirname(denoPath), { recursive: true });
            writeFileSync(denoPath, denoSource, { encoding: "utf-8" });
        }
    }
};

walkAndBuild("");

