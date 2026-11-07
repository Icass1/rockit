/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {ListenTogetherManager} from './lib/managers/listenTogetherManager';
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
            name: "runtime",
            setup(b) {
                b.onResolve(
                    { filter: /^@\/lib\/(rockit\/rockIt|http)$/ },
                    (args) => ({
                        path: args.path.endsWith("http") ? "http" : "rockit",
                        namespace: "mock",
                    })
                );
                b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
                    contents:
                        path === "http"
                            ? "export const Http = globalThis.http;"
                            : "export const rockIt = globalThis.rockIt;",
                }));
            },
        },
    ],
});
const flush = async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
};
const ok = () => ({ isOk: () => true });
const station = {
    publicId: "station",
    type: "station",
    provider: "radioBrowser",
    providerUrl: "https://example.com/station",
    name: "Station",
    imageUrl: "https://example.com/image",
    streamUrl: null,
    country: null,
    countryCode: null,
    codec: null,
    bitrate: null,
    tags: null,
    homepage: null,
    geoLat: null,
    geoLong: null,
};
const session = (overrides = {}) => ({
    publicId: "session",
    hostPublicId: "host-id",
    hostUsername: "host",
    hostImageUrl: null,
    guestPublicId: "guest-id",
    guestUsername: "guest",
    guestImageUrl: null,
    currentMediaPublicId: null,
    currentMediaName: null,
    currentMediaImageUrl: null,
    currentMedia: null,
    currentTimeMs: 1000,
    isPlaying: true,
    updatedAt: new Date().toISOString(),
    status: "active",
    ...overrides,
});
function setup(username = "guest") {
    const rockIt = {};
    const calls = { reads: 0, syncs: [], pauses: 0, plays: 0, restores: 0 };
    const http = {
        getActiveSessions: () => {
            calls.reads++;
            throw new Error("Unexpected sessions GET");
        },
        joinSession: async () => ok(),
        inviteToSession: async () => ok(),
        leaveSession: async () => ok(),
        syncSession: async (payload) => {
            calls.syncs.push(payload);
            return ok();
        },
    };
    const intervals = new Map();
    const listeners = new Set();
    let timerId = 0;
    const errors = [];
    let now = Date.now();
    class Clock extends Date {
        static now() {
            return now;
        }
    }
    const context = vm.createContext({
        rockIt,
        http,
        Date: Clock,
        process: { env: {} },
        console: { error: (...args) => errors.push(args) },
        setInterval: (fn) => {
            const id = ++timerId;
            intervals.set(id, fn);
            return id;
        },
        clearInterval: (id) => intervals.delete(id),
        window: {},
        document: {
            addEventListener: (_event, fn) => listeners.add(fn),
            removeEventListener: (_event, fn) => listeners.delete(fn),
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    const { createAtom, WebSocketManager, ListenTogetherManager } =
        context.module;
    rockIt.userManager = {
        sessionAtom: createAtom({ username }),
    };
    rockIt.mediaPlayerManager = {
        playingAtom: createAtom(false),
        currentTimeAtom: createAtom(0),
        currentTime: 0,
        isPlaybackOwner: true,
        pause: () => calls.pauses++,
        play: () => calls.plays++,
        setCurrentTime(time) {
            calls.seeks ??= [];
            calls.seeks.push(time);
        },
        setMedia: async () => {},
    };
    rockIt.queueManager = {
        currentMediaAtom: createAtom(undefined),
        captureListeningQueue: () => ({ currentQueueMediaId: null }),
        restoreListeningQueue: () => calls.restores++,
    };
    rockIt.webSocketManager = new WebSocketManager();
    rockIt.notificationManager = {
        notifyError: (message) => errors.push(message),
    };
    rockIt.vocabularyManager = {
        vocabulary: { FRIENDS_SESSION_ERROR: "session error" },
    };
    const manager = new ListenTogetherManager(rockIt);
    manager.start();
    const receive = (sessions) =>
        rockIt.webSocketManager._onMessageHandler({
            data: JSON.stringify({ type: "listen_together_sync", sessions }),
        });
    const tick = async (milliseconds) => {
        now += milliseconds;
        intervals.forEach((fn) => fn());
        await flush();
    };
    return {
        manager,
        rockIt,
        calls,
        receive,
        tick,
        http,
        errors,
        intervals,
        listeners,
    };
}

test("initial and reconnect snapshots update sessions without periodic GETs or guest autoplay", async () => {
    const { manager, receive, tick, calls } = setup();
    receive([session()]);
    assert.equal(manager.sessionsAtom.get().length, 1);
    assert.equal(manager.activeSessionAtom.get(), null);
    await tick(60000);
    assert.equal(calls.reads, 0);
    assert.equal(calls.syncs.length, 0);
    assert.equal(calls.plays, 0);
    receive([]);
    assert.equal(manager.sessionsAtom.get().length, 0);
});

test("join accepts snapshots arriving before or after the HTTP response and termination restores the queue", async () => {
    for (const early of [true, false]) {
        const { manager, receive, calls } = setup();
        if (early) receive([session()]);
        assert.equal(await manager.join("session"), true);
        if (!early) receive([session()]);
        await flush();
        assert.equal(manager.activeSessionAtom.get().publicId, "session");
        receive([]);
        assert.equal(manager.activeSessionAtom.get(), null);
        assert.equal(calls.restores, 1);
        assert.equal(calls.reads, 0);
    }
});

test("hosts publish playback and heartbeats while session updates arrive over the socket", async () => {
    const { manager, receive, tick, calls } = setup("host");
    receive([session()]);
    await flush();
    assert.equal(manager.isHost, true);
    assert.equal(calls.syncs.length, 1);
    await tick(5000);
    assert.equal(calls.syncs.length, 2);
    assert.equal(calls.reads, 0);
});

test("a silent host pauses guest playback locally and expiration restores the queue", async () => {
    const { manager, rockIt, receive, tick, calls } = setup();
    const media = station;
    rockIt.queueManager.currentMedia = media;
    await manager.join("session");
    receive([session({ currentMedia: { media } })]);
    await flush();
    assert.equal(calls.plays, 1);
    await tick(21000);
    assert.equal(calls.pauses, 1);
    await tick(100000);
    assert.equal(manager.activeSessionAtom.get(), null);
    assert.equal(calls.restores, 1);
    assert.equal(calls.reads, 0);
});

test("malformed session messages cannot replace validated state and logout ignores later snapshots", () => {
    const { manager, rockIt, receive, errors } = setup();
    receive([session()]);
    receive([{ publicId: "invalid" }]);
    assert.equal(errors.length, 1);
    assert.equal(manager.sessionsAtom.get()[0].publicId, "session");
    rockIt.userManager.sessionAtom.set(null);
    receive([session()]);
    assert.equal(manager.sessionsAtom.get().length, 0);
});

test("a newer snapshot supersedes playback that is still loading", async () => {
    const { manager, rockIt, receive, calls } = setup();
    await manager.join("session");
    let finishLoading;
    rockIt.mediaPlayerManager.setMedia = () =>
        new Promise((resolve) => {
            finishLoading = resolve;
        });
    rockIt.queueManager.setMedia = (medias) => {
        rockIt.queueManager.currentMedia = medias[0];
    };
    rockIt.queueManager.moveToMedia = () => {};
    receive([
        session({
            currentMedia: {
                media: station,
            },
        }),
    ]);
    receive([session({ isPlaying: false })]);
    finishLoading();
    await flush();
    assert.equal(calls.plays, 0);
    assert.equal(calls.pauses, 2);
    assert.equal(manager.activeSessionAtom.get().isPlaying, false);
});

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

test("start/stop balance the heartbeat, visibility, session, playback and socket listeners", async () => {
    const f = setup();
    const atoms = [
        f.rockIt.userManager.sessionAtom,
        f.rockIt.mediaPlayerManager.playingAtom,
        f.rockIt.mediaPlayerManager.currentTimeAtom,
        f.rockIt.queueManager.currentMediaAtom,
    ];
    f.manager.start();
    assert.equal(f.intervals.size, 1);
    assert.equal(f.listeners.size, 1);
    for (const atom of atoms) assert.equal(atom.lc, 1);
    f.manager.stop();
    f.manager.stop();
    assert.equal(f.intervals.size, 0);
    assert.equal(f.listeners.size, 0);
    for (const atom of atoms) assert.equal(atom.lc, 0);
    f.receive([session()]);
    assert.equal(f.manager.sessionsAtom.get().length, 0);
    assert.equal(await f.manager.join("session"), false);
    f.manager.start();
    f.receive([session()]);
    assert.equal(f.manager.sessionsAtom.get().length, 1);
    assert.equal(f.intervals.size, 1);
    assert.equal(f.listeners.size, 1);
    for (const atom of atoms) assert.equal(atom.lc, 1);
    f.manager.stop();
});

test("metadata retains consent but account round trips discard guest queues without restoring them", async () => {
    const f = setup();
    f.receive([session()]);
    await f.manager.join("session");
    f.rockIt.userManager.sessionAtom.set({
        username: "guest",
        image: "updated",
    });
    assert.equal(f.manager.activeSessionAtom.get().publicId, "session");
    for (const username of ["replacement", "guest"]) {
        f.rockIt.userManager.sessionAtom.set({ username });
        assert.equal(f.manager.sessionsAtom.get().length, 0);
        assert.equal(f.manager.activeSessionAtom.get(), null);
    }
    f.receive([session()]);
    assert.equal(f.manager.activeSessionAtom.get(), null);
    assert.equal(f.calls.restores, 0);
    f.manager.stop();
});

test("old mutations cannot join, restore, report errors or release a new account's loading state", async () => {
    for (const method of ["invite", "join", "leave"])
        for (const reject of [true, false]) {
            const f = setup();
            const old = deferred(),
                current = deferred();
            const endpoint = {
                invite: "inviteToSession",
                join: "joinSession",
                leave: "leaveSession",
            }[method];
            f.http[endpoint] = () => old.promise;
            const pending = f.manager[method]("session");
            f.manager.stop();
            f.manager.start();
            f.http.joinSession = () => current.promise;
            const fresh = f.manager.join("current");
            if (reject) old.reject(new Error("old failure"));
            else old.resolve(ok());
            assert.equal(await pending, false);
            assert.equal(f.manager.loadingAtom.get(), true);
            assert.equal(f.manager.activeSessionAtom.get(), null);
            assert.equal(f.calls.restores, 0);
            assert.equal(f.errors.length, 0);
            current.resolve(ok());
            assert.equal(await fresh, true);
            assert.equal(f.manager.loadingAtom.get(), false);
            f.manager.stop();
        }
});

test("old host sync completion cannot unlock or throttle replacement lifecycle heartbeats", async () => {
    const f = setup("host");
    const old = deferred(),
        current = deferred();
    f.http.syncSession = () => {
        f.calls.syncs.push("old");
        return old.promise;
    };
    f.receive([session()]);
    f.manager.stop();
    f.manager.start();
    f.http.syncSession = () => {
        f.calls.syncs.push("current");
        return current.promise;
    };
    f.receive([session()]);
    old.resolve(ok());
    await flush();
    await f.tick(5000);
    assert.equal(f.calls.syncs.length, 2);
    current.resolve(ok());
    await flush();
    await f.tick(5000);
    assert.equal(f.calls.syncs.length, 3);
    f.manager.stop();
});

test("late guest media loads cannot play or seek after account replacement or a same-account restart", async () => {
    for (const restart of [true, false]) {
        const f = setup();
        const load = deferred();
        f.rockIt.mediaPlayerManager.setMedia = () => load.promise;
        f.rockIt.queueManager.setMedia = (medias) => {
            f.rockIt.queueManager.currentMedia = medias[0];
        };
        f.rockIt.queueManager.moveToMedia = () => {};
        await f.manager.join("session");
        f.receive([
            session({ currentMedia: { media: station }, currentTimeMs: 9000 }),
        ]);
        if (restart) {
            f.manager.stop();
            f.manager.start();
        } else
            f.rockIt.userManager.sessionAtom.set({ username: "replacement" });
        load.resolve();
        await flush();
        assert.equal(f.calls.plays, 0);
        assert.equal(f.calls.seeks, undefined);
        assert.equal(f.calls.restores, 0);
        assert.equal(f.manager.activeSessionAtom.get(), null);
        f.manager.stop();
    }
});

test("queue restoration seeks only while the original lifecycle and consent remain current", async () => {
    for (const interrupt of ["none", "account", "join", "stop"]) {
        const f = setup();
        f.rockIt.queueManager.currentMedia = station;
        f.rockIt.queueManager.captureListeningQueue = () => ({
            currentQueueMediaId: 1,
            time: 42,
        });
        await f.manager.join("session");
        f.receive([session({ currentMedia: { media: station } })]);
        await flush();
        const load = deferred();
        f.rockIt.mediaPlayerManager.setMedia = () => load.promise;
        f.receive([]);
        f.receive([]);
        if (interrupt === "account")
            f.rockIt.userManager.sessionAtom.set({ username: "replacement" });
        if (interrupt === "join") await f.manager.join("another-session");
        if (interrupt === "stop") f.manager.stop();
        load.resolve();
        await flush();
        assert.deepEqual(f.calls.seeks ?? [], interrupt === "none" ? [42] : []);
        assert.equal(f.calls.restores, 1);
        f.manager.stop();
    }
});

test("failed leave retains consent and all live action failures use localized feedback", async () => {
    for (const method of ["invite", "join", "leave"]) {
        const f = setup();
        await f.manager.join("session");
        f.receive([session()]);
        const endpoint = {
            invite: "inviteToSession",
            join: "joinSession",
            leave: "leaveSession",
        }[method];
        f.http[endpoint] = async () => ({
            isOk: () => false,
            detail: "failed",
        });
        assert.equal(await f.manager[method]("session"), false);
        assert.equal(f.manager.activeSessionAtom.get().publicId, "session");
        assert.equal(f.errors.at(-1), "session error");
        assert.equal(f.manager.loadingAtom.get(), false);
        f.manager.stop();
    }
});
