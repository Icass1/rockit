const { execFileSync } = require("node:child_process");
const path = require("node:path");
const defaults = require("../version.json");

function resolveVersion({
    cwd = path.join(__dirname, ".."),
    config = defaults,
    release = false,
} = {}) {
    const git = (...args) =>
        execFileSync("git", ["-C", cwd, ...args], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    if (git("rev-parse", "--is-shallow-repository") === "true") {
        throw new Error(
            "Versioning requires full Git history and tags (fetch-depth: 0)."
        );
    }
    const tags = git("tag", "--list", `v${config.major}.*.0`)
        .split("\n")
        .filter((tag) => /^v2\.(0|[1-9]\d*)\.0$/.test(tag))
        .sort((a, b) => Number(b.split(".")[1]) - Number(a.split(".")[1]));
    const latest = tags[0];
    const minor = latest ? Number(latest.split(".")[1]) : config.minor;
    const base = latest || config.baseline;
    git("rev-parse", "--verify", `${base}^{commit}`);
    if (release) {
        // Retrying a published release must reuse the same version.
        if (
            latest &&
            git("rev-parse", `${latest}^{commit}`) === git("rev-parse", "HEAD")
        )
            return latest.slice(1);
        return `${config.major}.${minor + 1}.0`;
    }
    const patch = Number(
        git("rev-list", "--count", "--no-merges", `${base}..HEAD`)
    );
    return `${config.major}.${minor}.${patch}`;
}

module.exports = { resolveVersion };
if (require.main === module) {
    try {
        const override =
            process.env.ROCKIT_VERSION || process.env.NEXT_PUBLIC_APP_VERSION;
        if (override && !/^2\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(override))
            throw new Error("Expected a RockIt 2 version: 2.minor.patch");
        process.stdout.write(
            (override ||
                resolveVersion({
                    release: process.argv.includes("--release"),
                })) + "\n"
        );
    } catch (error) {
        process.stderr.write(
            `Cannot determine RockIt version: ${error.message}\n`
        );
        process.exitCode = 1;
    }
}
