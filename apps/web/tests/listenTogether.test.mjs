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
    const intervals = [];
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
        window: {
            setInterval: (fn) => intervals.push(fn),
            addEventListener() {},
        },
        document: { addEventListener() {} },
    });
    vm.runInContext(outputFiles[0].text, context);
    const { createAtom, WebSocketManager, ListenTogetherManager } =
        context.module;
    rockIt.userManager = {
        loggedInAtom: createAtom(true),
        usernameAtom: createAtom(username),
    };
    rockIt.mediaPlayerManager = {
        playingAtom: createAtom(false),
        currentTimeAtom: createAtom(0),
        currentTime: 0,
        isPlaybackOwner: true,
        pause: () => calls.pauses++,
        play: () => calls.plays++,
        setCurrentTime() {},
        setMedia: async () => {},
    };
    rockIt.queueManager = {
        currentMediaAtom: createAtom(undefined),
        captureListeningQueue: () => ({ currentQueueMediaId: null }),
        restoreListeningQueue: () => calls.restores++,
    };
    rockIt.webSocketManager = new WebSocketManager();
    const manager = new ListenTogetherManager();
    manager.init();
    const receive = (sessions) =>
        rockIt.webSocketManager._onMessageHandler({
            data: JSON.stringify({ type: "listen_together_sync", sessions }),
        });
    const tick = async (milliseconds) => {
        now += milliseconds;
        intervals.forEach((fn) => fn());
        await flush();
    };
    return { manager, rockIt, calls, receive, tick, http, errors };
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
    rockIt.userManager.loggedInAtom.set(false);
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
