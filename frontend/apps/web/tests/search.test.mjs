/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createElement } from "react";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const { outputFiles } = await build({
    stdin: {
        contents: `export {SearchManager} from './lib/managers/searchManager'; export {default as ProviderTag} from './components/ProviderTag/ProviderTag';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "http",
            setup(b) {
                b.onResolve(
                    { filter: /^@\/lib\/(http|rockit\/rockIt)$/ },
                    (args) => ({
                        path: args.path,
                        namespace: "mock",
                    })
                );
                b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
                    contents: path.endsWith("rockIt")
                        ? "export const rockIt = globalThis.rockIt;"
                        : "export const Http = globalThis.http;",
                }));
            },
        },
    ],
});
const ok = (result) => ({ isOk: () => true, result });
const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
};
const item = (name, extra = {}) => ({
    type: "song",
    name,
    providerUrl: `/song/${name}`,
    artists: [{ name: "Artist", url: "/artist" }],
    provider: "one",
    downloaded: false,
    ...extra,
});
function setup(count = 1, demand = false) {
    const calls = [],
        timers = new Map();
    let timerId = 0;
    const providers = Array.from({ length: count }, (_, i) => ({
        id: String(i + 1),
        name: String(i + 1),
        onDemand: demand && i === count - 1,
    }));
    const http = {
        searchProvidersAsync: async () => ok({ providers }),
        searchProviderAsync: (payload) =>
            new Promise((resolve) => calls.push({ payload, resolve })),
    };
    const playback = [];
    const rockIt = {
        queueManager: {
            setMedia: (...args) => playback.push(["queue", ...args]),
            moveToMedia: (id) => playback.push(["move", id]),
        },
        mediaPlayerManager: { play: () => playback.push(["play"]) },
        notificationManager: {
            notifyError: (message) => playback.push(["error", message]),
        },
        vocabularyManager: {
            vocabulary: { ERROR_GETTING_MEDIA: "Cannot play song" },
        },
    };
    const context = vm.createContext({
        rockIt,
        console,
        process: { env: { NODE_ENV: "test" } },
        http,
        setTimeout: (fn) => {
            const id = ++timerId;
            timers.set(id, fn);
            return id;
        },
        clearTimeout: (id) => timers.delete(id),
    });
    vm.runInContext(outputFiles[0].text, context);
    return {
        manager: new context.module.SearchManager(),
        ProviderTag: context.module.ProviderTag,
        calls,
        http,
        playback,
        timers,
        fire: () => {
            const pending = [...timers.values()];
            timers.clear();
            pending.forEach((fn) => fn());
        },
    };
}
const respond = (call, results = [], hasMoreTypes = []) =>
    call.resolve(ok({ results, hasMoreTypes }));

test("debounces, gives immediate feedback and ignores one-character queries", async () => {
    const { manager, calls, timers, fire } = setup();
    manager.scheduleSearch("da");
    manager.scheduleSearch("daft");
    manager.scheduleSearch("daft ");
    assert.equal(manager.queryAtom.get(), "daft");
    assert.equal(manager.inputAtom.get(), "daft ");
    assert.equal(manager.searchingAtom.get(), true);
    assert.equal(timers.size, 1);
    assert.equal(calls.length, 0);
    fire();
    await flush();
    assert.equal(calls.length, 1);
    respond(calls[0]);
    await flush();
    manager.scheduleSearch("x");
    fire();
    await flush();
    assert.equal(calls.length, 1);
    assert.equal(manager.searchingAtom.get(), false);
});
test("publishes fast results while another provider is still pending", async () => {
    const { manager, calls } = setup(2);
    const pending = manager.search("music");
    await flush();
    respond(calls[0], [item("first")]);
    await flush();
    assert.equal(manager.resultsAtom.get().results[0].name, "first");
    assert.equal(manager.searchingAtom.get(), true);
    respond(calls[1], [item("second")]);
    await pending;
    assert.equal(manager.resultsAtom.get().results.length, 2);
    assert.equal(manager.searchingAtom.get(), false);
});
test("obsolete queries cannot publish or launch queued provider calls", async () => {
    const { manager, calls } = setup(3);
    const old = manager.search("older");
    await flush();
    const recent = manager.search("newer");
    await flush();
    respond(calls[0], [item("stale")]);
    respond(calls[1]);
    await old;
    assert.equal(calls.filter((c) => c.payload.query === "older").length, 2);
    respond(calls[2], [item("current")]);
    respond(calls[3]);
    await flush();
    respond(calls[4]);
    await recent;
    assert.equal(manager.resultsAtom.get().results.length, 1);
    assert.equal(manager.resultsAtom.get().results[0].name, "current");
});
test("clearing invalidates in-flight results", async () => {
    const { manager, calls } = setup();
    const pending = manager.search("music");
    await flush();
    manager.clearResults();
    respond(calls[0], [item("stale")]);
    await pending;
    assert.equal(manager.resultsAtom.get(), undefined);
    assert.equal(manager.searchingAtom.get(), false);
});
test("completed queries refresh local availability after a download", async () => {
    const { manager, calls } = setup();
    const pending = manager.search("Daft Punk");
    await flush();
    respond(calls[0], [item("song")]);
    await pending;
    const refresh = manager.search("daft punk");
    assert.equal(manager.resultsAtom.get().results.length, 1);
    await flush();
    assert.equal(calls.length, 2);
    respond(calls[1], [
        item("song", { downloaded: true, publicId: "local-song" }),
    ]);
    await refresh;
    assert.equal(manager.resultsAtom.get().results.length, 1);
    assert.equal(manager.resultsAtom.get().results[0].downloaded, true);
    assert.equal(manager.resultsAtom.get().results[0].publicId, "local-song");
});
test("expansion is on demand, coalesces scrolls, deduplicates and stops at the end", async () => {
    const { manager, calls } = setup();
    const pending = manager.search("music");
    await flush();
    respond(calls[0], [item("one")], ["song"]);
    await pending;
    assert.equal(calls.length, 1);
    const more = manager.loadMore("song");
    await flush();
    await manager.loadMore("song");
    assert.equal(calls.length, 2);
    assert.equal(calls[1].payload.limit, 30);
    assert.equal(calls[1].payload.mediaType, "song");
    respond(calls[1], [item("one"), item("two")]);
    await more;
    assert.equal(manager.resultsAtom.get().results.length, 2);
    await manager.loadMore("song");
    assert.equal(calls.length, 2);
});
test("errors preserve successful results and permit retry", async () => {
    const { manager, calls } = setup(2);
    const initial = manager.search("music");
    await flush();
    respond(calls[0], [item("available")]);
    calls[1].resolve({ isOk: () => false });
    await initial;
    assert.equal(manager.resultsAtom.get().results.length, 1);
    assert.equal(manager.errorAtom.get(), true);
    assert.equal(manager.searchingAtom.get(), false);
    const retry = manager.search("music");
    await flush();
    assert.equal(calls.length, 4);
    respond(calls[2]);
    respond(calls[3]);
    await retry;
    assert.equal(manager.errorAtom.get(), false);
});
test("deduplication prefers downloaded media", async () => {
    const { manager, calls } = setup(2);
    const pending = manager.search("music");
    await flush();
    respond(calls[0], [item("song")]);
    respond(calls[1], [
        item("song", {
            downloaded: true,
            providerUrl: "/local/song",
            provider: "two",
        }),
    ]);
    await pending;
    assert.equal(manager.resultsAtom.get().results.length, 1);
    assert.equal(manager.resultsAtom.get().results[0].downloaded, true);
});

test("costly video searches require explicit intent", async () => {
    const { manager, calls } = setup(2, true);
    const initial = manager.search("music");
    await flush();
    assert.equal(calls.length, 1);
    respond(calls[0], [item("song")]);
    await initial;
    const video = manager.loadProvider("2");
    await flush();
    assert.equal(calls.length, 2);
    const duplicate = manager.loadProvider("2");
    await duplicate;
    assert.equal(calls.length, 2);
    respond(calls[1], [item("video", { type: "video" })]);
    await video;
    assert.equal(manager.resultsAtom.get().results.length, 2);
});

test("keeps every source available and card identity stable as providers arrive", async () => {
    const { manager, calls } = setup(2);
    const pending = manager.search("music");
    await flush();
    respond(calls[1], [
        item("song", { provider: "two", providerUrl: "/two/song" }),
    ]);
    await flush();
    const first = manager.resultsAtom.get().results[0];
    const key = manager.getResultKey(first);
    respond(calls[0], [item("song", { downloaded: true })]);
    await pending;
    const result = manager.resultsAtom.get().results[0];
    assert.equal(manager.getResultKey(result), key);
    assert.equal(manager.getSources(result).length, 2);
    assert.equal(manager.getSources(result)[1].providerUrl, "/two/song");
    assert.equal(result.downloaded, true);
});

test("does not merge different editions within a provider or unrelated playlists", async () => {
    const { manager, calls } = setup(2);
    const pending = manager.search("music");
    await flush();
    respond(calls[0], [
        item("song"),
        item("song", { providerUrl: "/edition" }),
        item("mix", { type: "playlist", providerUrl: "/playlist/one" }),
    ]);
    respond(calls[1], [
        item("song", { provider: "two", providerUrl: "/two" }),
        item("mix", {
            type: "playlist",
            provider: "two",
            providerUrl: "/playlist/two",
        }),
    ]);
    await pending;
    const results = manager.resultsAtom.get().results;
    assert.equal(results.length, 4);
    assert.equal(
        new Set(results.map((result) => manager.getResultKey(result))).size,
        4
    );
    assert.equal(manager.getSources(results[0]).length, 2);
});

test("search headings and accessibility labels contain no hardcoded text", () => {
    const root = fileURLToPath(
        new URL("../components/Search/", import.meta.url)
    );
    const files = [];
    const collect = (directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = `${directory}/${entry.name}`;
            if (entry.isDirectory()) collect(path);
            else if (path.endsWith(".tsx")) files.push(path);
        }
    };
    collect(root);
    for (const file of files) {
        const source = ts.createSourceFile(
            file,
            readFileSync(file, "utf8"),
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
        );
        const visit = (node) => {
            if (ts.isJsxText(node))
                assert.ok(
                    !/\p{L}/u.test(node.text),
                    `Hardcoded visible text in ${file}: ${node.text.trim()}`
                );
            if (
                ts.isJsxAttribute(node) &&
                ["alt", "aria-label", "title", "placeholder"].includes(
                    node.name.getText(source)
                ) &&
                node.initializer &&
                ts.isStringLiteral(node.initializer)
            ) {
                assert.equal(
                    node.initializer.text,
                    "",
                    `Hardcoded accessible label in ${file}`
                );
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
});

test("unknown providers keep their name when no icon exists", () => {
    const { ProviderTag } = setup();
    const unknown = renderToStaticMarkup(
        createElement(ProviderTag, { name: "Custom Provider", iconOnly: true })
    );
    const spotify = renderToStaticMarkup(
        createElement(ProviderTag, { name: "Spotify", iconOnly: true })
    );
    assert.ok(unknown.includes("Custom Provider"));
    assert.ok(!unknown.includes("<svg"));
    assert.ok(spotify.includes("<svg"));
});

test("downloaded search songs resolve their existing media before playback", async () => {
    const { manager, http, playback } = setup();
    const song = { publicId: "stored-song", downloaded: true, type: "song" };
    const requested = [];
    http.getSong = async (id) => {
        requested.push(id);
        return ok(song);
    };
    await manager.playDownloadedSong(
        item("Already here", { publicId: song.publicId, downloaded: true })
    );
    assert.deepEqual(requested, [song.publicId]);
    assert.equal(playback[0][0], "queue");
    assert.equal(playback[0][1][0], song);
    assert.equal(playback[1][1], song.publicId);
    assert.equal(playback[2][0], "play");
});

test("undownloaded, missing-id and non-song search items never request playback", async () => {
    const { manager, http, playback } = setup();
    http.getSong = async () => {
        throw new Error("Unexpected media request");
    };
    await manager.playDownloadedSong(
        item("Not downloaded", { publicId: "id" })
    );
    await manager.playDownloadedSong(item("No ID", { downloaded: true }));
    await manager.playDownloadedSong(
        item("Album", { type: "album", downloaded: true, publicId: "id" })
    );
    assert.equal(playback.length, 0);
});

test("stale downloaded search results report errors without replacing the queue", async () => {
    for (const response of [ok({ downloaded: false }), { isOk: () => false }]) {
        const { manager, http, playback } = setup();
        http.getSong = async () => response;
        await manager.playDownloadedSong(
            item("Stale", { downloaded: true, publicId: "id" })
        );
        assert.equal(playback.length, 1);
        assert.equal(playback[0][0], "error");
    }
});
