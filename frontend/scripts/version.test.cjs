const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { resolveVersion } = require("./version.cjs");

test("commits increment patch; merges do not; promotions reset patch and increment minor", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "rockit-version-"));
    const git = (...args) =>
        execFileSync("git", ["-C", cwd, ...args], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    try {
        git("init", "-b", "develop");
        git("config", "user.name", "Version test");
        git("config", "user.email", "version@example.test");
        git("commit", "--allow-empty", "-m", "baseline");
        const config = {
            major: 2,
            minor: 0,
            baseline: git("rev-parse", "HEAD"),
        };
        const version = (release = false) =>
            resolveVersion({ cwd, config, release });
        assert.equal(version(), "2.0.0");
        git("branch", "master");
        git("checkout", "-b", "feature");
        git("commit", "--allow-empty", "-m", "first");
        assert.equal(version(), "2.0.1");
        git("commit", "--allow-empty", "-m", "second");
        assert.equal(version(), "2.0.2");
        git("checkout", "develop");
        git("merge", "--no-ff", "feature", "-m", "merge feature");
        assert.equal(version(), "2.0.2");
        git("checkout", "master");
        git("merge", "--no-ff", "develop", "-m", "promote develop");
        assert.equal(version(true), "2.1.0");
        git("tag", "v2.1.0");
        assert.equal(version(true), "2.1.0");
        assert.equal(version(), "2.1.0");
        git("checkout", "develop");
        assert.equal(version(), "2.1.0");
        git("commit", "--allow-empty", "-m", "next feature");
        assert.equal(version(), "2.1.1");
        git("checkout", "master");
        git("merge", "--no-ff", "develop", "-m", "next promotion");
        assert.equal(version(true), "2.2.0");
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
});
