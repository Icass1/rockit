import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const target = process.argv[2] ?? "web";
const root = path.resolve(import.meta.dirname, "..");
const directory = path.resolve(root, process.argv[3] ?? "apps/mobile/dist");
async function walk(dir) {
    return (
        await Promise.all(
            (await readdir(dir, { withFileTypes: true })).map((entry) =>
                entry.isDirectory()
                    ? walk(path.join(dir, entry.name))
                    : [path.join(dir, entry.name)]
            )
        )
    ).flat();
}
const files = await walk(directory);
const sources = new Set();
for (const file of files.filter((file) => file.endsWith(".map"))) {
    const map = JSON.parse(await readFile(file, "utf8"));
    for (const source of map.sources ?? [])
        sources.add(source.replaceAll("\\", "/"));
    for (const section of map.sections ?? [])
        for (const source of section.map.sources ?? [])
            sources.add(source.replaceAll("\\", "/"));
}
if (!sources.size)
    throw new Error(`No source maps were found for the ${target} graph`);
const forbidden = [...sources].filter(
    (source) =>
        /apps\/web\//.test(source) ||
        (target === "web"
            ? /apps\/mobile\/.*\.native\.[jt]sx?$/.test(source)
            : /apps\/mobile\/.*\.web\.[jt]sx?$|packages\/platform-browser\//.test(
                  source
              ))
);
if (forbidden.length)
    throw new Error(
        `Wrong platform sources in ${target} bundle:\n${forbidden.join("\n")}`
    );
const javascript = await Promise.all(
    files
        .filter((file) => /\.(?:js|hbc|bundle)$/.test(file))
        .map(async (file) => ({
            file: path.relative(directory, file),
            bytes: (await stat(file)).size,
        }))
);
await mkdir(path.join(root, ".test-build/frontend"), { recursive: true });
await writeFile(
    path.join(root, `.test-build/frontend/${target}-bundle.json`),
    JSON.stringify({ target, sourceCount: sources.size, javascript }, null, 2)
);
process.stdout.write(
    `${target}: ${sources.size} mapped modules, no sources from the other application/platform.\n`
);
