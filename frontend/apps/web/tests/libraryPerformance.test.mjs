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
test("collection resolution limits concurrency, preserves order and surfaces errors", async () => {
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
    http.resolveCollectionQueue = async () => ({
        isOk: () => false,
        message: "unavailable",
    });
    await assert.rejects(
        service.expandPlaylistsToPlayable(input),
        /unavailable/
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
                                    : "export const expandPlaylistsToPlayable = batch => globalThis.resolveBatch(batch);";
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

const selectionMethod = source.slice(
    source.indexOf("    setQueueMediaId(queueMediaId?: number"),
    source.indexOf("    setCurrentList(")
);
const selectionCode = await transform(
    `class Selector { ${selectionMethod} }; return Selector;`,
    { loader: "ts" }
);
const user = { queueType: "RANDOM" };
const Selector = new Function(
    "getRockIt",
    "EQueueType",
    "isStation",
    selectionCode.code
)(
    () => ({ userManager: user }),
    { RANDOM: "RANDOM", SORTED: "SORTED" },
    () => false
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
