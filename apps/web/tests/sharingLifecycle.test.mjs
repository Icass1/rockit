/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {SharingManager} from './lib/managers/sharingManager';
export {createAtom} from '../../packages/shared/src/lib/store';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "isolated-sharing",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/(http|rockit\/rockIt)$/ },
                    ({ path }) => ({ path, namespace: "fixture" })
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixture" },
                    ({ path }) => ({
                        contents:
                            path === "@/lib/http"
                                ? "export const Http=fixture.http;"
                                : "export const rockIt=undefined;",
                    })
                );
            },
        },
    ],
});
const ok = (result = {}) => ({ isOk: () => true, result });
const fail = { isOk: () => false, detail: "failed" };
const items = (id) => ok({ items: [{ publicId: id }] });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup() {
    globalThis.window = {};
    const requests = [],
        handlers = new Set(),
        notifications = [],
        playback = [];
    const http = new Proxy(
        {},
        {
            get:
                (_, name) =>
                (...args) =>
                    new Promise((resolve, reject) =>
                        requests.push({ name, args, resolve, reject })
                    ),
        }
    );
    const testModule = { exports: {} };
    new Function(
        "require",
        "module",
        "exports",
        "fixture",
        outputFiles[0].text
    )(createRequire(import.meta.url), testModule, testModule.exports, { http });
    const { SharingManager, createAtom } = testModule.exports;
    const session = createAtom({ username: "first" });
    let subscriptions = 0;
    const services = {
        userManager: {
            sessionAtom: {
                subscribe(fn) {
                    subscriptions++;
                    const off = session.subscribe(fn);
                    return () => {
                        subscriptions--;
                        off();
                    };
                },
            },
        },
        webSocketManager: {
            onMessage(type, fn) {
                assert.equal(type, "social_changed");
                handlers.add(fn);
            },
            offMessage(type, fn) {
                assert.equal(type, "social_changed");
                handlers.delete(fn);
            },
        },
        notificationManager: {
            notifyError: (text) => notifications.push(text),
            notifySuccess: (text) => notifications.push(text),
        },
        vocabularyManager: {
            vocabulary: new Proxy({}, { get: (_, key) => key }),
        },
        mediaManager: { getMedia: (id) => http.getMedia(id) },
        queueManager: {
            setMedia: (media, name) => playback.push(["set", media, name]),
            moveToMedia: (id) => playback.push(["move", id]),
            addMediaToEnd: (media) => playback.push(["add", media]),
        },
        mediaPlayerManager: { play: () => playback.push(["play"]) },
    };
    const manager = new SharingManager(services);
    return {
        manager,
        session,
        requests,
        handlers,
        notifications,
        playback,
        subscriptions: () => subscriptions,
        start() {
            manager.start();
            for (let i = requests.length - 1; i >= 0; i--) {
                if (
                    ["getShareInbox", "getShareSent"].includes(requests[i].name)
                )
                    requests.splice(i, 1)[0].resolve(ok({ items: [] }));
            }
        },
        emit() {
            for (const fn of handlers) fn({});
        },
    };
}
function assertEmpty(manager) {
    assert.deepEqual(manager.inboxAtom.get(), []);
    assert.deepEqual(manager.sentAtom.get(), []);
    assert.equal(manager.composeMediaAtom.get(), null);
    assert.equal(manager.errorAtom.get(), null);
}
const actions = [
    "fetchInbox",
    "fetchSent",
    "shareMedia",
    "deleteShare",
    "markAsSeen",
    "playSharedMedia",
    "queueSharedMedia",
];

test("sharing startup is shell owned and restartable; server construction performs no work", async () => {
    const f = setup();
    delete globalThis.window;
    f.manager.start();
    assert.equal(f.requests.length, 0);
    assert.equal(f.subscriptions(), 0);
    globalThis.window = {};
    f.start();
    f.manager.start();
    await tick();
    assert.equal(f.subscriptions(), 1);
    assert.equal(f.handlers.size, 1);
    f.manager.compose("media");
    assert.equal(f.manager.composeMediaAtom.get(), "media");
    f.manager.stop();
    f.manager.stop();
    assertEmpty(f.manager);
    assert.equal(f.subscriptions(), 0);
    assert.equal(f.handlers.size, 0);
    f.start();
    await tick();
    assert.equal(f.subscriptions(), 1);
    f.manager.stop();
});

test("metadata retains work while direct identity changes clear shares and composer and load the new account", async () => {
    const f = setup();
    f.start();
    await tick();
    f.manager.compose("media");
    const pending = f.manager.fetchInbox();
    f.session.set({ username: "first", image: "changed" });
    assert.equal(f.requests.length, 1);
    f.requests[0].resolve(items("retained"));
    await pending;
    assert.equal(f.manager.inboxAtom.get()[0].publicId, "retained");
    assert.equal(f.manager.composeMediaAtom.get(), "media");
    f.session.set({ username: "second" });
    assertEmpty(f.manager);
    assert.equal(f.manager.loadingAtom.get(), true);
    assert.deepEqual(
        f.requests.slice(1).map((r) => r.name),
        ["getShareInbox", "getShareSent"]
    );
    f.manager.stop();
});

test("all sharing and media actions reject late success and failure across account round trips, logout and restarts", async () => {
    for (const action of actions)
        for (const transition of ["account", "logout", "restart"])
            for (const outcome of [
                items("private"),
                fail,
                new Error("offline"),
            ]) {
                const f = setup();
                f.start();
                await tick();
                const pending = f.manager[action]("private", "media");
                const request = f.requests[0];
                if (transition === "account") {
                    f.session.set({ username: "second" });
                    f.session.set({ username: "first" });
                } else if (transition === "logout") f.session.set(null);
                else {
                    f.manager.stop();
                    f.manager.start();
                }
                const count = f.requests.length;
                if (outcome instanceof Error) request.reject(outcome);
                else request.resolve(outcome);
                assert.ok([false, undefined].includes(await pending));
                assert.equal(
                    f.requests.length,
                    count,
                    "Stale operations cannot launch follow-up work"
                );
                assertEmpty(f.manager);
                assert.deepEqual(f.notifications, []);
                assert.deepEqual(f.playback, []);
                if (transition === "logout")
                    assert.equal(f.manager.loadingAtom.get(), false);
                else
                    assert.equal(
                        f.manager.loadingAtom.get(),
                        true,
                        "Old inbox finalizer must not clear the new request's loading state"
                    );
                f.manager.stop();
            }
});

test("stopped and signed-out actions cannot issue HTTP, open the composer or accept events", async () => {
    const f = setup();
    f.start();
    f.session.set(null);
    f.requests.length = 0;
    for (const stopped of [false, true]) {
        if (stopped) f.manager.stop();
        f.manager.compose("private");
        f.emit();
        for (const action of actions)
            await f.manager[action]("private", "media");
        assertEmpty(f.manager);
        assert.equal(f.requests.length, 0);
    }
});

test("newer inbox and sent reads win; stale finalizers cannot release current loading state", async () => {
    const f = setup();
    f.start();
    await tick();
    const oldInbox = f.manager.fetchInbox(),
        oldSent = f.manager.fetchSent();
    f.emit();
    f.requests[0].resolve(items("old"));
    f.requests[1].reject(new Error("offline"));
    await Promise.all([oldInbox, oldSent]);
    assert.equal(f.manager.loadingAtom.get(), true);
    assertEmpty(f.manager);
    f.requests[2].resolve(items("current"));
    f.requests[3].resolve(items("current"));
    await tick();
    assert.equal(f.manager.inboxAtom.get()[0].publicId, "current");
    assert.equal(f.manager.sentAtom.get()[0].publicId, "current");
    assert.equal(f.manager.loadingAtom.get(), false);
    f.manager.stop();
});

test("share completion checks identity again after refreshing sent items", async () => {
    const f = setup();
    f.start();
    await tick();
    f.manager.compose("private");
    const pending = f.manager.shareMedia("recipient", "private");
    f.requests[0].resolve(ok());
    await tick();
    assert.equal(f.requests[1].name, "getShareSent");
    f.session.set({ username: "second" });
    f.requests[1].resolve(items("private"));
    assert.equal(await pending, false);
    assertEmpty(f.manager);
    assert.deepEqual(f.notifications, []);
    f.manager.stop();
});

test("an old submit cannot close or notify over a replacement composer in the same account", async () => {
    const f = setup();
    f.start();
    await tick();
    f.manager.compose("old");
    const pending = f.manager.shareMedia("recipient", "old");
    f.manager.closeComposer();
    f.manager.compose("new");
    f.requests[0].resolve(ok());
    await tick();
    f.requests[1].resolve(items("old"));
    assert.equal(await pending, false);
    assert.equal(f.manager.composeMediaAtom.get(), "new");
    assert.deepEqual(f.notifications, []);
    f.manager.stop();
});

test("live successful sharing refreshes sent items and retains existing success feedback", async () => {
    const f = setup();
    f.start();
    await tick();
    const pending = f.manager.shareMedia("recipient", "media", "hello");
    assert.deepEqual(f.requests[0].args, [
        {
            recipientPublicId: "recipient",
            mediaPublicId: "media",
            message: "hello",
        },
    ]);
    f.requests[0].resolve(ok());
    await tick();
    f.requests[1].resolve(items("sent"));
    assert.equal(await pending, true);
    assert.equal(f.manager.sentAtom.get()[0].publicId, "sent");
    assert.deepEqual(f.notifications, ["FRIENDS_MEDIA_SHARED"]);
    f.manager.stop();
});

test("HTTP and transport failures are handled locally and failed mark-seen cannot refresh", async () => {
    for (const action of actions)
        for (const outcome of [fail, new Error("offline")]) {
            const f = setup();
            f.start();
            await tick();
            const pending = f.manager[action]("media", "media");
            if (outcome instanceof Error) f.requests[0].reject(outcome);
            else f.requests[0].resolve(outcome);
            await pending;
            assert.equal(f.requests.length, 1);
            if (["fetchInbox", "fetchSent"].includes(action))
                assert.equal(f.manager.errorAtom.get(), "FRIENDS_LOAD_ERROR");
            else assert.deepEqual(f.notifications, ["FRIENDS_ACTION_ERROR"]);
            f.manager.stop();
        }
});

test("media commands use the injected playback owners and preserve queueability", async () => {
    const f = setup();
    f.start();
    await tick();
    const media = { publicId: "song", type: "song" };
    const queue = f.manager.queueSharedMedia("song");
    f.requests[0].resolve(ok({ media }));
    await queue;
    const play = f.manager.playSharedMedia("song");
    f.requests[1].resolve(ok({ media }));
    await play;
    assert.deepEqual(f.playback, [
        ["add", media],
        ["set", [media], ""],
        ["move", "song"],
        ["play"],
    ]);
    const unqueueable = f.manager.playSharedMedia("album");
    f.requests[2].resolve(ok({ media: { publicId: "album", type: "album" } }));
    await unqueueable;
    assert.equal(f.playback.length, 4);
    f.manager.stop();
});
