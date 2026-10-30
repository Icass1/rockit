/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {Http} from './lib/http';
export {BookmarkManager} from './lib/managers/bookmarkManager';
export {WebSocketManager} from './lib/managers/webSocketManger';
export {createAtom} from '../../packages/shared/src/lib/store';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "rockit",
            setup(b) {
                b.onResolve({ filter: /^@\/lib\/rockit\/rockIt$/ }, () => ({
                    path: "rockit",
                    namespace: "mock",
                }));
                b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
                    contents: "export const rockIt = globalThis.rockIt;",
                }));
            },
        },
    ],
});
const flush = async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
};
function setup() {
    const calls = [];
    const rockIt = { userManager: { loggedInAtom: { get: () => false } } };
    const context = vm.createContext({
        rockIt,
        console,
        URLSearchParams,
        Response,
        process: { env: {} },
        window: {},
        fetch: (url, options) =>
            new Promise((resolve) => calls.push({ url, options, resolve })),
    });
    vm.runInContext(outputFiles[0].text, context);
    const { createAtom } = context.module;
    const media = createAtom(undefined);
    rockIt.queueManager = {
        currentMediaAtom: media,
        get currentMedia() {
            return media.get();
        },
    };
    return { ...context.module, calls, media };
}
function respond(call, body) {
    call.resolve(new Response(JSON.stringify(body), { status: 200 }));
}
const bookmark = (id) => ({
    publicId: `bookmark-${id}`,
    mediaPublicId: id,
    timestamp: 5,
    description: null,
    mode: "AUTOSKIP",
    dateAdded: "2026-01-01T00:00:00Z",
    dateUpdated: "2026-01-01T00:00:00Z",
});

test("lyrics views share in-flight requests and refresh after settlement", async () => {
    const { Http, calls } = setup();
    const first = Http.getLyricsCorrectionContextAsync("a");
    const second = Http.getLyricsCorrectionContextAsync("a");
    assert.equal(first, second);
    assert.equal(calls.length, 1);
    respond(calls[0], {
        publicId: "a",
        provider: "LRCLIB",
        revision: null,
        offset: 0,
        lines: [],
        syncStatus: "provider",
    });
    assert.equal((await first).isOk(), true);
    const refresh = Http.getLyricsCorrectionContextAsync("a");
    const otherProvider = Http.getLyricsCorrectionContextAsync("a", "other");
    assert.equal(calls.length, 3);
    respond(calls[1], {
        publicId: "a",
        provider: "LRCLIB",
        revision: null,
        offset: 0,
        lines: [],
        syncStatus: "provider",
    });
    respond(calls[2], {
        publicId: "a",
        provider: "other",
        revision: null,
        offset: 0,
        lines: [],
        syncStatus: "provider",
    });
    await Promise.all([refresh, otherProvider]);
});

test("late bookmarks cannot overwrite newer media, including a return to the same track", async () => {
    const { BookmarkManager, media, calls } = setup();
    const manager = new BookmarkManager();
    await manager.init();
    media.set({ publicId: "a" });
    media.set({ publicId: "b" });
    respond(calls[1], { bookmarks: [bookmark("b")] });
    await flush();
    assert.equal(manager.currentMediaBookmarksAtom.get()[0].mediaPublicId, "b");
    media.set({ publicId: "a" });
    assert.equal(manager.currentMediaBookmarksAtom.get().length, 0);
    respond(calls[2], { bookmarks: [bookmark("a")] });
    await flush();
    respond(calls[0], { bookmarks: [] });
    await flush();
    assert.equal(manager.currentMediaBookmarksAtom.get()[0].mediaPublicId, "a");
    media.set({ publicId: "a" });
    assert.equal(calls.length, 3);
    media.set({ publicId: "c" });
    media.set(undefined);
    respond(calls[3], { bookmarks: [bookmark("c")] });
    await flush();
    assert.equal(manager.currentMediaBookmarksAtom.get().length, 0);
});

test("delayed playback acknowledgements are discarded before reaching queue subscribers", () => {
    const { WebSocketManager } = setup();
    const manager = new WebSocketManager();
    const received = [];
    manager.onMessage("current_media", (data) =>
        received.push(data.playbackId)
    );
    const message = (id, owner = true) => ({
        type: "current_media",
        playbackId: id,
        mediaPublicId: id,
        queueMediaId: 1,
        queueType: "SORTED",
        isPlaybackOwner: owner,
    });
    for (let i = 0; i < 10; i++) manager.sendCurrentMedia(message(String(i)));
    const receive = (data) =>
        manager._onMessageHandler({ data: JSON.stringify(data) });
    receive(message("1"));
    receive(message("9"));
    receive(message("2", false));
    receive(message("remote", false));
    assert.deepEqual(received, ["9", "remote"]);
});
