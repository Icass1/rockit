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
    const session = createAtom({ username: "first" });
    const notices = [];
    rockIt.userManager.sessionAtom = session;
    rockIt.notificationManager = {
        notifySuccess: (message) => notices.push(message),
        notifyError: (message) => notices.push(message),
    };
    rockIt.queueManager = {
        currentMediaAtom: media,
        get currentMedia() {
            return media.get();
        },
    };
    return {
        ...context.module,
        calls,
        media,
        session,
        notices,
        services: rockIt,
    };
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
    manager.start();
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
    manager.stop();
});

test("bookmark lifecycle balances subscriptions and discards responses after Strict Mode cleanup", async () => {
    const { BookmarkManager, services, session, media, calls } = setup();
    media.set({ publicId: "a" });
    const manager = new BookmarkManager(services);
    assert.equal(media.lc, 0);
    assert.equal(session.lc, 0);
    assert.equal(calls.length, 0);
    manager.start();
    manager.start();
    assert.equal(media.lc, 1);
    assert.equal(session.lc, 1);
    assert.equal(calls.length, 1);
    manager.togglePopup();
    manager.stop();
    manager.stop();
    assert.equal(media.lc, 0);
    assert.equal(session.lc, 0);
    assert.equal(manager.showPopupAtom.get(), false);
    manager.start();
    assert.equal(calls.length, 2);
    respond(calls[1], { bookmarks: [bookmark("a")] });
    await flush();
    respond(calls[0], { bookmarks: [] });
    await flush();
    assert.equal(manager.currentMediaBookmarksAtom.get().length, 1);
    manager.stop();
    media.set({ publicId: "b" });
    session.set({ username: "second" });
    assert.equal(calls.length, 2);
});

test("account changes clear bookmark state and reject old reads even on a return to the same account", async () => {
    const { BookmarkManager, services, session, media, calls } = setup();
    media.set({ publicId: "a" });
    const manager = new BookmarkManager(services);
    manager.start();
    session.set({ username: "first", image: "updated" });
    assert.equal(calls.length, 1);
    session.set({ username: "second" });
    assert.equal(calls.length, 2);
    respond(calls[1], { bookmarks: [bookmark("a")] });
    await flush();
    manager.openEditForBookmark("bookmark-a");
    assert.equal(manager.showPopupAtom.get(), true);
    session.set(null);
    assert.equal(manager.currentMediaBookmarksAtom.get().length, 0);
    assert.equal(manager.editingBookmarkAtom.get(), null);
    assert.equal(manager.showPopupAtom.get(), false);
    media.set({ publicId: "b" });
    assert.equal(calls.length, 2);
    media.set({ publicId: "a" });
    session.set({ username: "first" });
    respond(calls[2], { bookmarks: [bookmark("new")] });
    await flush();
    respond(calls[0], { bookmarks: [bookmark("old")] });
    await flush();
    assert.equal(
        manager.currentMediaBookmarksAtom.get()[0].mediaPublicId,
        "new"
    );
    manager.stop();
});

test("late bookmark mutations cannot modify another account or notify after cleanup", async () => {
    for (const operation of ["create", "update", "delete"]) {
        for (const invalidation of ["account", "stop", "media"]) {
            const {
                BookmarkManager,
                services,
                session,
                media,
                calls,
                notices,
            } = setup();
            media.set({ publicId: "a" });
            const manager = new BookmarkManager(services);
            manager.start();
            respond(calls[0], { bookmarks: [bookmark("a")] });
            await flush();
            const pending =
                operation === "create"
                    ? manager.createBookmarkAsync(5, null)
                    : operation === "update"
                      ? manager.updateBookmarkAsync(
                            "bookmark-a",
                            10,
                            null,
                            null
                        )
                      : manager.deleteBookmarkAsync("bookmark-a");
            if (invalidation === "account") session.set({ username: "second" });
            else if (invalidation === "stop") manager.stop();
            else media.set({ publicId: "b" });
            respond(calls[1], bookmark("a"));
            assert.equal(await pending, operation === "delete" ? false : null);
            assert.equal(manager.currentMediaBookmarksAtom.get().length, 0);
            assert.deepEqual(notices, []);
            manager.stop();
        }
    }
});

test("active bookmark mutations and navigation keep using the injected state owners", async () => {
    const { BookmarkManager, services, media, calls, notices, createAtom } =
        setup();
    const seeks = [];
    services.mediaPlayerManager = {
        currentTimeAtom: createAtom(0),
        setCurrentTime: (time) => seeks.push(time),
    };
    media.set({ publicId: "a" });
    const manager = new BookmarkManager(services);
    manager.start();
    respond(calls[0], { bookmarks: [] });
    await flush();
    const creating = manager.createBookmarkAsync(5, null);
    respond(calls[1], bookmark("a"));
    assert.equal((await creating).timestamp, 5);
    assert.equal(manager.skipToNextBookmark(), true);
    assert.deepEqual(seeks, [5]);
    const updating = manager.updateBookmarkAsync("bookmark-a", 10, null, null);
    respond(calls[2], { ...bookmark("a"), timestamp: 10 });
    assert.equal((await updating).timestamp, 10);
    assert.equal(manager.currentMediaBookmarksAtom.get()[0].timestamp, 10);
    const deleting = manager.deleteBookmarkAsync("bookmark-a");
    respond(calls[3], { message: "Deleted" });
    assert.equal(await deleting, true);
    assert.equal(manager.currentMediaBookmarksAtom.get().length, 0);
    assert.equal(notices.length, 3);
    manager.stop();
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
