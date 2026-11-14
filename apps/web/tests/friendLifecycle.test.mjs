/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {FriendManager} from './lib/managers/friendManager';
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
            name: "isolated-friends",
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
const tick = () => new Promise((resolve) => setImmediate(resolve));
const readResult = (id) =>
    ok({
        friends: [{ publicId: id }],
        incoming: [{ publicId: id }],
        sent: [{ publicId: id }],
        activities: [{ mediaPublicId: id }],
        results: [{ publicId: id }],
        entries: [{ userId: id }],
        currentUser: { userId: id },
    });
function setup() {
    globalThis.window = {};
    const requests = [],
        handlers = new Map(),
        notifications = [];
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
    const { FriendManager, createAtom } = testModule.exports;
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
                if (!handlers.has(type)) handlers.set(type, new Set());
                handlers.get(type).add(fn);
            },
            offMessage(type, fn) {
                handlers.get(type)?.delete(fn);
            },
        },
        notificationManager: {
            notifyError: (text) => notifications.push(text),
            notifySuccess: (text) => notifications.push(text),
        },
        vocabularyManager: {
            vocabulary: new Proxy({}, { get: (_, key) => key }),
        },
    };
    const manager = new FriendManager(services);
    return {
        manager,
        session,
        requests,
        notifications,
        handlers,
        subscriptions: () => subscriptions,
        emit(type, message) {
            for (const fn of handlers.get(type) ?? []) fn(message);
        },
        start() {
            manager.start();
            const index = requests.findLastIndex(
                (req) => req.name === "getBlockedUsers"
            );
            if (index >= 0)
                requests.splice(index, 1)[0].resolve(ok({ friends: [] }));
        },
    };
}
const reads = [
    "fetchFriends",
    "fetchBlocked",
    "fetchRequests",
    "fetchActivity",
    "searchUsers",
    "fetchLeaderboard",
];
const mutations = [
    "sendRequest",
    "acceptRequest",
    "rejectRequest",
    "removeFriend",
    "blockUser",
    "unblockUser",
];
const atoms = [
    "friendsAtom",
    "blockedAtom",
    "incomingRequestsAtom",
    "sentRequestsAtom",
    "activityAtom",
    "searchResultsAtom",
];
function assertEmpty(manager) {
    for (const name of atoms) assert.deepEqual(manager[name].get(), [], name);
    assert.equal(manager.errorAtom.get(), null);
    assert.equal(manager.loadingAtom.get(), false);
}

test("friend subscriptions are shell owned, restartable and absent on the server", async () => {
    const f = setup();
    delete globalThis.window;
    f.manager.start();
    assert.equal(f.subscriptions(), 0);
    assert.equal(f.handlers.size, 0);
    globalThis.window = {};
    f.start();
    f.manager.start();
    assert.equal(f.subscriptions(), 1);
    assert.deepEqual(
        [...f.handlers.values()].map((set) => set.size),
        [1, 1, 1]
    );
    f.emit("social_changed", readResult("friend").result);
    f.manager.stop();
    f.manager.stop();
    assertEmpty(f.manager);
    assert.equal(f.subscriptions(), 0);
    assert.ok([...f.handlers.values()].every((set) => set.size === 0));
    f.start();
    assert.equal(f.subscriptions(), 1);
    f.manager.stop();
});

test("metadata updates retain work; direct account switches reset all state and scope", async () => {
    const f = setup();
    f.start();
    const pending = f.manager.searchUsers("query");
    const scope = f.manager.scopeAtom.get();
    f.session.set({ username: "first", image: "changed" });
    f.requests[0].resolve(readResult("retained"));
    await pending;
    assert.equal(f.manager.searchResultsAtom.get()[0].publicId, "retained");
    assert.equal(f.manager.scopeAtom.get(), scope);
    f.session.set({ username: "second" });
    assertEmpty(f.manager);
    assert.ok(f.manager.scopeAtom.get() > scope);
    assert.equal(f.requests.at(-1).name, "getBlockedUsers");
    f.manager.stop();
});

test("all reads reject late success, HTTP failure and transport failure across account round trips, logout and restart", async () => {
    for (const method of reads)
        for (const transition of ["account", "logout", "restart"])
            for (const outcome of [
                readResult("private"),
                fail,
                new Error("offline"),
            ]) {
                const f = setup();
                f.start();
                await tick();
                const pending = f.manager[method]("query");
                const read = f.requests[0];
                if (transition === "account") {
                    f.session.set({ username: "second" });
                    f.session.set({ username: "first" });
                } else if (transition === "logout") f.session.set(null);
                else {
                    f.manager.stop();
                    f.manager.start();
                }
                if (outcome instanceof Error) read.reject(outcome);
                else read.resolve(outcome);
                const result = await pending;
                if (method === "fetchLeaderboard")
                    assert.deepEqual(result, {
                        entries: [],
                        currentUser: null,
                    });
                assertEmpty(f.manager);
                assert.deepEqual(f.notifications, []);
                f.manager.stop();
            }
});

test("stale mutations cannot alter new state, notify or launch follow-up reads", async () => {
    for (const method of mutations)
        for (const outcome of [ok(), fail, new Error("offline")]) {
            const f = setup();
            f.start();
            await tick();
            const pending = f.manager[method]("private");
            f.manager.stop();
            f.start();
            await tick();
            const count = f.requests.length;
            if (outcome instanceof Error) f.requests[0].reject(outcome);
            else f.requests[0].resolve(outcome);
            const result = await pending;
            assert.ok(result === false || result === undefined);
            assert.equal(f.requests.length, count);
            assertEmpty(f.manager);
            assert.deepEqual(f.notifications, []);
            f.manager.stop();
        }
});

test("stopped and signed-out actions cannot issue HTTP or accept socket state", async () => {
    const f = setup();
    f.start();
    f.session.set(null);
    f.requests.length = 0;
    for (const stopped of [false, true]) {
        if (stopped) f.manager.stop();
        for (const method of [...reads, ...mutations])
            await f.manager[method]("private");
        f.emit("social_changed", readResult("private").result);
        f.emit("friend_activity", { userPublicId: "private" });
        assertEmpty(f.manager);
    }
    assert.equal(f.requests.length, 0);
});

test("socket snapshots supersede pending reads and preserve deduplicated activity and cleared presence", async () => {
    const f = setup();
    f.start();
    await tick();
    const pending = Promise.all([
        f.manager.fetchFriends(),
        f.manager.fetchRequests(),
        f.manager.fetchActivity(),
    ]);
    f.emit("social_changed", {
        friends: [{ publicId: "friend", isOnline: true, nowPlaying: "song" }],
        incoming: [],
        sent: [],
        activities: [],
    });
    f.emit("friends_presence_changed", {
        userPublicId: "friend",
        isOnline: false,
        nowPlaying: null,
    });
    assert.equal(f.manager.friendsAtom.get()[0].nowPlaying, null);
    const activity = {
        userPublicId: "friend",
        mediaPublicId: "song",
        listenedAt: "now",
    };
    f.emit("friend_activity", activity);
    f.emit("friend_activity", activity);
    for (const req of f.requests) req.resolve(readResult("stale"));
    await pending;
    assert.equal(f.manager.friendsAtom.get()[0].publicId, "friend");
    assert.deepEqual(f.manager.incomingRequestsAtom.get(), []);
    assert.equal(f.manager.activityAtom.get().length, 1);
    assert.equal(f.manager.loadingAtom.get(), false);
    f.manager.stop();
});

test("latest search wins and shortening the query cancels pending results and errors", async () => {
    const f = setup();
    f.start();
    await tick();
    const old = f.manager.searchUsers("old");
    const current = f.manager.searchUsers("current");
    f.requests[1].resolve(readResult("current"));
    await current;
    f.requests[0].resolve(readResult("old"));
    await old;
    assert.equal(f.manager.searchResultsAtom.get()[0].publicId, "current");
    const pending = f.manager.searchUsers("pending");
    await f.manager.searchUsers("");
    f.requests[2].reject(new Error("offline"));
    await pending;
    assertEmpty(f.manager);
    f.manager.stop();
});

test("successful friend mutations and live failures retain their existing behavior", async () => {
    const f = setup();
    f.start();
    await tick();
    const search = f.manager.searchUsers("query");
    f.requests[0].resolve(readResult("user"));
    await search;
    const sent = f.manager.sendRequest("user");
    f.requests[1].resolve(ok());
    assert.equal(await sent, true);
    assert.equal(f.manager.searchResultsAtom.get()[0].requestSent, true);
    assert.deepEqual(f.notifications, ["FRIENDS_REQUEST_SENT"]);
    const blocked = f.manager.blockUser("user");
    f.requests[2].reject(new Error("offline"));
    await blocked;
    assert.equal(f.notifications.at(-1), "FRIENDS_ACTION_ERROR");
    const request = f.manager.fetchRequests();
    f.requests[3].resolve(fail);
    await request;
    assert.equal(f.manager.errorAtom.get(), "FRIENDS_LOAD_ERROR");
    f.manager.stop();
});

test("successful removal cannot be undone by an older friends response", async () => {
    const f = setup();
    f.start();
    await tick();
    f.emit("social_changed", { ...readResult("friend").result });
    const read = f.manager.fetchFriends();
    const mutation = f.manager.removeFriend("friend");
    f.requests[1].resolve(ok());
    await mutation;
    f.requests[0].resolve(readResult("friend"));
    await read;
    assert.deepEqual(f.manager.friendsAtom.get(), []);
    assert.equal(f.manager.loadingAtom.get(), false);
    f.manager.stop();
});

test("listening profiles use the explicit friend or self endpoint and propagate current errors", async () => {
    const f = setup();
    f.start();
    const pending = f.manager.fetchListeningProfile("friend-public-id");
    const request = f.requests.find((item) => item.name === "getUserLevel");
    assert.deepEqual(request.args, ["friend-public-id"]);
    request.resolve(
        ok({ userId: "friend-public-id", totalListeningSeconds: 3600 })
    );
    assert.equal((await pending).totalListeningSeconds, 3600);
    const own = f.manager.fetchListeningProfile();
    f.requests.find((item) => item.name === "getMyLevel").resolve(fail);
    await assert.rejects(own, /failed/);
    f.manager.stop();
    const count = f.requests.length;
    assert.equal(
        await f.manager.fetchListeningProfile("friend-public-id"),
        null
    );
    assert.equal(f.requests.length, count);
});
test("listening profiles discard old-account responses and failures", async () => {
    for (const rejected of [false, true]) {
        const f = setup();
        f.start();
        const pending = f.manager.fetchListeningProfile("private");
        const request = f.requests.find((item) => item.name === "getUserLevel");
        f.session.set({ username: "replacement" });
        if (rejected) request.reject(new Error("old account"));
        else request.resolve(ok({ userId: "private" }));
        assert.equal(await pending, null);
        f.manager.stop();
    }
});
