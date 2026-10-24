import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build, transform } from "esbuild";

const http = {};
globalThis.testHttp = http;
const { outputFiles } = await build({
    entryPoints: ["lib/services/mediaService.ts"],
    bundle: true,
    write: false,
    format: "esm",
    plugins: [
        {
            name: "stubs",
            setup(build) {
                build.onResolve({ filter: /^@/ }, (args) => ({
                    path: args.path,
                    namespace: "stub",
                }));
                build.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
                    contents:
                        args.path === "@/lib/http"
                            ? "export const Http = globalThis.testHttp"
                            : "export const isQueueable = item => item.type === 'song' || item.type === 'video'",
                    loader: "js",
                }));
            },
        },
    ],
});
const service = await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
);
delete globalThis.testHttp;
test("collection resolution limits concurrency, preserves order and reports failures", async () => {
    let active = 0,
        peak = 0;
    http.resolveCollectionQueue = async (id) => {
        peak = Math.max(peak, ++active);
        await new Promise((resolve) =>
            setTimeout(resolve, (12 - Number(id)) % 4)
        );
        active--;
        return {
            isOk: () => true,
            result: { queue: [{ media: { type: "song", publicId: id } }] },
        };
    };
    const input = Array.from({ length: 12 }, (_, i) => ({
        publicId: String(i),
    }));
    const result = await service.expandAlbumsToPlayable(input);
    assert.equal(peak, 4);
    assert.deepEqual(
        result.map((x) => x.publicId),
        input.map((x) => x.publicId)
    );
    assert.deepEqual(await service.expandAlbumsToPlayable([]), []);
    const failed = [];
    http.resolveCollectionQueue = async (id) => {
        if (id === "2") throw new Error("offline");
        if (id === "5") return { isOk: () => false, message: "unavailable" };
        return {
            isOk: () => true,
            result: { queue: [{ media: { type: "song", publicId: id } }] },
        };
    };
    const partial = await service.expandPlaylistsToPlayable(input, (id) =>
        failed.push(id)
    );
    assert.deepEqual(failed.sort(), ["2", "5"]);
    assert.deepEqual(
        partial.map((entry) => entry.publicId),
        input
            .map((entry) => entry.publicId)
            .filter((id) => !failed.includes(id))
    );
});
const source = await readFile(
    "../../packages/shared/src/managers/baseQueueManager.ts",
    "utf8"
);
const method = source.slice(
    source.indexOf("    appendMedias("),
    source.indexOf("    addMediaToEnd(")
);
const compiled = await transform(`class Queue { ${method} }; return Queue;`, {
    loader: "ts",
});
const Queue = new Function("isQueueable", compiled.code)(
    (item) => item.type === "song"
);
test("appending 3000 items keeps existing ids and synchronizes once", () => {
    const queue = new Queue();
    queue.sortedQueue = [{ queueMediaId: 9, media: { publicId: "current" } }];
    const reference = queue.sortedQueue;
    queue.randomQueue = [...queue.sortedQueue];
    let updates = 0;
    queue.updateQueue = () => updates++;
    queue.appendMedias(
        Array.from({ length: 3000 }, (_, i) => ({
            type: "song",
            publicId: String(i),
        })),
        "library"
    );
    assert.equal(queue.sortedQueue, reference);
    assert.equal(queue.sortedQueue[0].queueMediaId, 9);
    assert.equal(queue.sortedQueue.at(-1).queueMediaId, 3009);
    assert.equal(updates, 1);
    queue.appendMedias([], "library");
    assert.equal(updates, 1);
});

test("new batches mix into the pending random queue while preserving the played prefix", () => {
    const queue = new Queue();
    queue.sortedQueue = [0, 1, 2, 3].map((queueMediaId) => ({
        queueMediaId,
        media: { type: "song", publicId: String(queueMediaId) },
    }));
    queue.randomQueue = [...queue.sortedQueue];
    queue.currentQueueMediaId = 1;
    let updates = 0;
    queue.updateQueue = () => updates++;
    const originalRandom = Math.random;
    try {
        Math.random = () => 0;
        queue.appendMedias(
            [4, 5].map((id) => ({ type: "song", publicId: String(id) })),
            "library"
        );
    } finally {
        Math.random = originalRandom;
    }
    assert.deepEqual(
        queue.randomQueue.map((item) => item.queueMediaId),
        [0, 1, 3, 4, 5, 2]
    );
    assert.deepEqual(
        queue.sortedQueue.map((item) => item.queueMediaId),
        [0, 1, 2, 3, 4, 5]
    );
    assert.equal(queue.currentQueueMediaId, 1);
    assert.equal(updates, 1);
});

// Exercise the storage helpers with an isolated IndexedDB adapter.
test("offline library snapshots are account-scoped and never read the legacy shared key", async () => {
    const records = new Map();
    records.set("library:current", { data: { marker: "legacy-account" } });
    globalThis.testOfflineDB = {
        get: async (store, key) => records.get(`${store}:${key}`),
        put: async (store, value, key) => records.set(`${store}:${key}`, value),
        delete: async (store, key) => records.delete(`${store}:${key}`),
    };
    try {
        const built = await build({
            entryPoints: ["lib/offline/db.ts"],
            bundle: true,
            write: false,
            format: "esm",
            tsconfig: "tsconfig.json",
            plugins: [
                {
                    name: "offline-db",
                    setup(builder) {
                        builder.onResolve({ filter: /^idb$/ }, () => ({
                            path: "idb",
                            namespace: "mock",
                        }));
                        builder.onLoad(
                            { filter: /.*/, namespace: "mock" },
                            () => ({
                                contents:
                                    "export const openDB = async () => globalThis.testOfflineDB;",
                            })
                        );
                    },
                },
            ],
        });
        const db = await import(
            `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
        );
        assert.equal(await db.loadLibraryOffline("alice"), null);
        assert.equal(await db.loadLibraryOffline("bob"), null);
        assert.equal(await db.loadLibraryOffline(""), null);
        await db.saveLibraryOffline("alice", { marker: "alice" });
        await db.saveLibraryOffline("bob", { marker: "bob" });
        // A late write from the previous account stays in that account's slot.
        await db.saveLibraryOffline("alice", { marker: "alice-late" });
        assert.equal(
            (await db.loadLibraryOffline("alice")).marker,
            "alice-late"
        );
        assert.equal((await db.loadLibraryOffline("bob")).marker, "bob");
        await db.clearSessionOffline();
        assert.equal(records.has("library:current"), false);
        assert.equal((await db.loadLibraryOffline("bob")).marker, "bob");
    } finally {
        delete globalThis.testOfflineDB;
    }
});

const componentBuild = await build({
    entryPoints: ["components/Library/PlayLibraryButton.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "component",
    jsx: "transform",
    jsxFactory: "h",
    tsconfigRaw: { compilerOptions: { jsx: "react" } },
    plugins: [
        {
            name: "playback-stubs",
            setup(build) {
                build.onResolve({ filter: /^(react|@|lucide)/ }, (args) => ({
                    path: args.path,
                    namespace: "stub",
                }));
                build.onLoad({ filter: /.*/, namespace: "stub" }, (args) => {
                    const contents =
                        args.path === "react"
                            ? "export const useRef = value => ({current: value}); export const useState = value => [value, () => {}];"
                            : args.path === "@nanostores/react"
                              ? "export const useStore = atom => atom.get();"
                              : args.path === "lucide-react"
                                ? 'export const Play = "play"; export const Pause = "pause";'
                                : args.path === "@/lib/http"
                                  ? "export const Http = globalThis.playbackHttp;"
                                  : args.path === "@/lib/rockit/rockIt"
                                    ? "export const rockIt = globalThis.playbackRockIt;"
                                    : "export const expandPlaylistsToPlayable = (batch, onFailure) => globalThis.resolveBatch(batch, onFailure);";
                    return { contents, loader: "js" };
                });
            },
        },
    ],
});
test("library starts before collections resolve and abandons a replaced queue", async () => {
    let finish;
    let played = 0,
        appended = 0;
    const queue = {
        queueAtom: { get: () => [] },
        currentQueueMediaIdAtom: { get: () => null },
        queueIdentity: {},
        setMedia: () => {
            queue.queueIdentity = {};
        },
        setQueueMediaId: (...args) => assert.deepEqual(args, []),
        appendMedias: () => appended++,
    };
    globalThis.playbackRockIt = {
        queueManager: queue,
        mediaPlayerManager: {
            playingAtom: { get: () => false },
            play: () => played++,
        },
        notificationManager: { notifyError: (error) => assert.fail(error) },
    };
    globalThis.playbackHttp = {
        getUserLibraryMedias: async () => ({
            isOk: () => true,
            result: {
                songs: [{ item: { type: "song", publicId: "first" } }],
                videos: [],
                albums: [{ item: { publicId: "album" } }],
                playlists: [],
            },
        }),
    };
    globalThis.resolveBatch = () =>
        new Promise((resolve) => {
            finish = resolve;
        });
    const Component = new Function(
        "h",
        `${componentBuild.outputFiles[0].text}; return component.default;`
    )((tag, props) => props);
    const button = Component();
    const pending = button.onClick();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(played, 1);
    queue.queueIdentity = {}; // The user selected another collection while loading.
    finish([{ type: "song", publicId: "late" }]);
    await pending;
    assert.equal(appended, 0);
    delete globalThis.playbackRockIt;
    delete globalThis.playbackHttp;
    delete globalThis.resolveBatch;
});

test("library keeps successful collections and later batches after a failure and warns once", async () => {
    const appended = [];
    let played = 0,
        warnings = 0,
        batches = 0;
    const queue = {
        queueAtom: { get: () => [] },
        currentQueueMediaIdAtom: { get: () => null },
        queueIdentity: {},
        setMedia: () => {
            queue.queueIdentity = {};
        },
        setQueueMediaId: () => {},
        appendMedias: (media) =>
            appended.push(...media.map((item) => item.publicId)),
    };
    globalThis.playbackRockIt = {
        queueManager: queue,
        mediaPlayerManager: {
            playingAtom: { get: () => false },
            play: () => played++,
        },
        notificationManager: {
            notifyError: (error) => assert.fail(error),
            notifyWarn: () => warnings++,
        },
        vocabularyManager: {
            vocabulary: { ERROR_GETTING_QUEUE: "partial failure" },
        },
    };
    globalThis.playbackHttp = {
        getUserLibraryMedias: async () => ({
            isOk: () => true,
            result: {
                songs: [{ item: { type: "song", publicId: "first" } }],
                videos: [],
                playlists: [],
                albums: Array.from({ length: 5 }, (_, i) => ({
                    item: { publicId: `a${i}` },
                })),
            },
        }),
    };
    globalThis.resolveBatch = async (batch, onFailure) => {
        batches++;
        return batch.flatMap((item) => {
            if (item.publicId === "a0") {
                onFailure(item.publicId);
                return [];
            }
            return [{ type: "song", publicId: item.publicId }];
        });
    };
    try {
        const Component = new Function(
            "h",
            `${componentBuild.outputFiles[0].text}; return component.default;`
        )((tag, props) => props);
        await Component().onClick();
        assert.equal(played, 1);
        assert.equal(batches, 2);
        assert.deepEqual(appended, ["a1", "a2", "a3", "a4"]);
        assert.equal(warnings, 1);
    } finally {
        delete globalThis.playbackRockIt;
        delete globalThis.playbackHttp;
        delete globalThis.resolveBatch;
    }
});

const selectionMethod = source.slice(
    source.indexOf("    setQueueMediaId(queueMediaId?: number"),
    source.indexOf("    setCurrentList(")
);
const selectionCode = await transform(
    `class Selector { ${selectionMethod} }; return Selector;`,
    { loader: "ts" }
);
const user = { queueType: "RANDOM" };
const selectionFeedback = { warnings: 0, pauses: 0 };
const selectorRockIt = {
    userManager: user,
    notificationManager: {
        notifyWarn: () => selectionFeedback.warnings++,
        notifyError: (message) => assert.fail(message),
    },
    vocabularyManager: { vocabulary: { MEDIA_NOT_DOWNLOADED: "unavailable" } },
    mediaPlayerManager: { pause: () => selectionFeedback.pauses++ },
};
const Selector = new Function(
    "getRockIt",
    "EQueueType",
    "isStation",
    selectionCode.code
)(
    () => selectorRockIt,
    { RANDOM: "RANDOM", SORTED: "SORTED" },
    (media) => media.type === "station"
);
test("random start can select different songs; sorted start selects the first", () => {
    const selector = new Selector();
    const items = [11, 22, 33].map((queueMediaId) => ({
        queueMediaId,
        media: { downloaded: true },
    }));
    selector.queue = items;
    let selected;
    selector._queueAtom = { get: () => items };
    selector._currentQueueMediaIdAtom = {
        set: (id) => {
            selected = id;
        },
    };
    selector._currentMediaAtom = { set: () => {} };
    selector._currentListAtom = { set: () => {} };
    const originalRandom = Math.random;
    try {
        user.queueType = "RANDOM";
        Math.random = () => 0;
        selector.setQueueMediaId();
        assert.equal(selected, 11);
        Math.random = () => 0.99;
        selector.setQueueMediaId();
        assert.equal(selected, 33);
        user.queueType = "SORTED";
        selector.setQueueMediaId();
        assert.equal(selected, 11);
    } finally {
        Math.random = originalRandom;
    }
});

function selectionFixture(media) {
    const selector = new Selector();
    const items = media.map((item, queueMediaId) => ({
        queueMediaId,
        media: item,
    }));
    const selected = [];
    let current;
    selector.queue = items;
    selector._queueAtom = { get: () => items };
    selector._currentQueueMediaIdAtom = { set: (id) => selected.push(id) };
    selector._currentMediaAtom = {
        set: (media) => {
            current = media;
        },
    };
    selector._currentListAtom = { set: () => {} };
    return { selector, selected, current: () => current };
}
test("selection skips consecutive unavailable entries without publishing intermediate ids", () => {
    const fixture = selectionFixture([
        { type: "song", downloaded: true },
        { type: "song", downloaded: false },
        { type: "song", downloaded: false },
        { type: "song", downloaded: true },
    ]);
    fixture.selector.setQueueMediaId(1);
    assert.deepEqual(fixture.selected, [3]);
    fixture.selector.setQueueMediaId(2, -1);
    assert.deepEqual(fixture.selected, [3, 0]);
    fixture.selector.setQueueMediaId(2);
    assert.deepEqual(fixture.selected, [3, 0, 3]);
});
test("unavailable-only queues stop without attempting an item, while stations remain playable", () => {
    const fixture = selectionFixture([
        { type: "song", downloaded: false },
        { type: "video", downloaded: false },
    ]);
    const before = selectionFeedback.pauses;
    fixture.selector.setQueueMediaId(0);
    assert.deepEqual(fixture.selected, [null]);
    assert.equal(fixture.current(), undefined);
    assert.equal(selectionFeedback.pauses, before + 1);
    const radio = selectionFixture([
        { type: "song", downloaded: false },
        { type: "station" },
    ]);
    radio.selector.setQueueMediaId(0);
    assert.deepEqual(radio.selected, [1]);
    assert.equal(radio.current().type, "station");
});
const peekCode = await transform(
    `class Queue { ${source.slice(source.indexOf("    peekNextQueueItem():"), source.indexOf("    // #endregion: Methods", source.indexOf("    peekNextQueueItem():")))} }; return Queue;`,
    { loader: "ts" }
);
const PeekQueue = new Function("isStation", peekCode.code)(
    (media) => media.type === "station"
);
test("preloading looks past unavailable songs and reports no candidate when all are unavailable", () => {
    const queue = new PeekQueue();
    queue.queue = [true, false, false, true].map(
        (downloaded, queueMediaId) => ({
            queueMediaId,
            media: { type: "song", downloaded },
        })
    );
    queue.currentQueueMediaId = 0;
    assert.equal(queue.peekNextQueueItem().queueMediaId, 3);
    queue.queue.forEach((entry) => {
        entry.media.downloaded = false;
    });
    assert.equal(queue.peekNextQueueItem(), undefined);
});
