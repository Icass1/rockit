/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents:
            "export {MediaSessionManager} from './lib/managers/mediaSessionManager';",
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "sessionModule",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "isolated-rockit",
            setup(b) {
                b.onResolve({ filter: /^@\/lib\/rockit\/rockIt$/ }, () => ({
                    path: "fixture",
                    namespace: "mock",
                }));
                b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
                    contents: "export const rockIt = globalThis.rockitFixture;",
                }));
            },
        },
    ],
});

function atom(initial) {
    let value = initial;
    const listeners = new Set();
    return {
        get: () => value,
        set(next) {
            if (next === value) return;
            value = next;
            for (const fn of listeners) fn(value);
        },
        subscribe(fn) {
            listeners.add(fn);
            fn(value);
            return () => listeners.delete(fn);
        },
    };
}
function song(id) {
    return {
        type: "song",
        publicId: id,
        name: id,
        artists: [],
        album: { name: "Album" },
        duration_ms: 180000,
        imageUrl: "",
    };
}
function setup({
    playing = true,
    supported = true,
    noMedia = false,
    writable = true,
} = {}) {
    const currentMedia = atom(noMedia ? undefined : song("first"));
    const playingAtom = atom(playing);
    const currentTimeAtom = atom(0);
    const transport = { play: 0, pause: 0, seek: 0, next: 0, previous: 0 };
    const handlers = new Map();
    let metadata;
    let state = "none";
    const writes = [];
    const session = {
        get playbackState() {
            return state;
        },
        set playbackState(value) {
            if (!writable) throw new Error("playbackState unsupported");
            state = value;
            writes.push(value);
        },
        get metadata() {
            return metadata;
        },
        set metadata(value) {
            metadata = value;
            // Simulate native controls resetting at a track metadata change.
            state = "paused";
        },
        setPositionState() {},
        setActionHandler: (action, handler) => handlers.set(action, handler),
    };
    const documentHandlers = new Set();
    const document = {
        hidden: true,
        addEventListener: (_name, handler) => documentHandlers.add(handler),
        removeEventListener: (_name, handler) =>
            documentHandlers.delete(handler),
    };
    const player = {
        playingAtom,
        currentTimeAtom,
        currentTime: 0,
        play: () => transport.play++,
        pause: () => transport.pause++,
        setCurrentTime: () => transport.seek++,
    };
    const rockitFixture = {
        mediaPlayerManager: player,
        queueManager: {
            currentMediaAtom: currentMedia,
            get currentMedia() {
                return currentMedia.get();
            },
            skipForward: () => transport.next++,
            skipBack: () => transport.previous++,
        },
    };
    const context = vm.createContext({
        process: { env: {} },
        window: {},
        document,
        navigator: supported
            ? { userAgent: "iPhone", mediaSession: session }
            : { userAgent: "iPhone" },
        MediaMetadata: class {
            constructor(value) {
                Object.assign(this, value);
            }
        },
        rockitFixture,
        console,
    });
    vm.runInContext(outputFiles[0].text, context);
    const manager = new context.sessionModule.MediaSessionManager();
    manager.init();
    return {
        manager,
        session,
        currentMedia,
        playingAtom,
        currentTimeAtom,
        transport,
        handlers,
        writes,
        document,
        documentHandlers,
    };
}
function assertTransportUntouched(e) {
    assert.deepEqual(e.transport, {
        play: 0,
        pause: 0,
        seek: 0,
        next: 0,
        previous: 0,
    });
}

test("continuous transitions republish playing after the incoming metadata without restarting audio", () => {
    const e = setup();
    assert.equal(e.session.playbackState, "playing");
    const writes = e.writes.length;
    e.currentMedia.set(song("second"));
    assert.equal(e.session.metadata.title, "second");
    assert.equal(e.playingAtom.get(), true);
    assert.equal(e.session.playbackState, "playing");
    assert.ok(e.writes.length > writes);
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("background position updates repair a later native state reset", () => {
    const e = setup();
    e.currentMedia.set(song("second"));
    e.session.playbackState = "paused";
    e.currentTimeAtom.set(1);
    assert.equal(e.session.playbackState, "playing");
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("an explicit pause stays paused across track and visibility updates", () => {
    const e = setup();
    e.playingAtom.set(false);
    e.currentMedia.set(song("second"));
    e.currentTimeAtom.set(2);
    e.document.hidden = false;
    for (const handler of e.documentHandlers) handler();
    assert.equal(e.session.playbackState, "paused");
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("empty queues report none instead of an actionable paused song", () => {
    const e = setup();
    e.currentMedia.set(undefined);
    assert.equal(e.session.metadata, null);
    assert.equal(e.session.playbackState, "none");
    e.playingAtom.set(false);
    e.currentTimeAtom.set(3);
    assert.equal(e.session.playbackState, "none");
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("rapid handoffs and pause changes use the latest state without delayed writes", () => {
    const e = setup();
    e.currentMedia.set(song("second"));
    e.playingAtom.set(false);
    e.currentMedia.set(song("third"));
    assert.equal(e.session.playbackState, "paused");
    e.playingAtom.set(true);
    e.currentTimeAtom.set(4);
    assert.equal(e.session.playbackState, "playing");
    assert.equal(e.session.metadata.title, "third");
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("destroy removes reporting subscriptions and visibility recovery", () => {
    const e = setup();
    e.manager.destroy();
    const writes = e.writes.length;
    e.currentMedia.set(song("second"));
    e.playingAtom.set(false);
    e.currentTimeAtom.set(5);
    assert.equal(e.documentHandlers.size, 0);
    assert.equal(e.writes.length, writes);
    assertTransportUntouched(e);
});

test("native play and pause actions still call the original transport exactly once", () => {
    const e = setup();
    e.handlers.get("play")();
    assert.equal(e.transport.play, 1);
    assert.equal(e.transport.pause, 0);
    e.handlers.get("pause")();
    assert.equal(e.transport.pause, 1);
    assert.equal(e.transport.seek, 0);
    e.manager.destroy();
});

test("unsupported media session does not install handlers or affect transport", () => {
    const e = setup({ supported: false });
    assert.equal(e.handlers.size, 0);
    assert.equal(e.documentHandlers.size, 0);
    e.currentMedia.set(song("second"));
    assertTransportUntouched(e);
    e.manager.destroy();
});

test("a read-only native playback state does not break metadata or audio controls", () => {
    const e = setup({ writable: false });
    e.currentMedia.set(song("second"));
    e.currentTimeAtom.set(6);
    assert.equal(e.session.metadata.title, "second");
    assertTransportUntouched(e);
    e.handlers.get("pause")();
    assert.equal(e.transport.pause, 1);
    e.manager.destroy();
});
