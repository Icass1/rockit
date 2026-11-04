/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents:
            "export {MediaSessionManager} from './lib/managers/mediaSessionManager'; export {PlaybackLifecycle} from './lib/runtime/playbackLifecycle';",
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "sessionModule",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
});

function atom(initial) {
    let value = initial;
    const listeners = new Set();
    return {
        get: () => value,
        get listenerCount() {
            return listeners.size;
        },
        set(next) {
            if (next === value) return;
            value = next;
            for (const fn of listeners) fn(value);
        },
        listen(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
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
        album: { name: "Album", artists: [] },
        duration_ms: 180000,
        imageUrl: "",
    };
}
function setup({
    playing = true,
    supported = true,
    noMedia = false,
    writable = true,
    initialize = true,
    sessionSnapshot = { username: "fixture" },
    resumeKeepalive,
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
    const documentListeners = new Map([
        ["visibilitychange", new Set()],
        ["pointerup", new Set()],
        ["keydown", new Set()],
    ]);
    const documentHandlers = documentListeners.get("visibilitychange");
    const document = {
        hidden: true,
        addEventListener: (name, handler) =>
            documentListeners.get(name).add(handler),
        removeEventListener: (name, handler) =>
            documentListeners.get(name).delete(handler),
    };
    const activation = {
        settings: 0,
        transitions: 0,
        keepalives: 0,
        closed: 0,
    };
    const sessionAtom = atom(sessionSnapshot);
    const player = {
        playingAtom,
        volumeAtom: atom(1),
        currentTimeAtom,
        currentTime: 0,
        play: () => transport.play++,
        pause: () => transport.pause++,
        setCurrentTime: () => transport.seek++,
        initializeTransitionSettings: () => activation.settings++,
        activateTransitionsOnGesture: () => activation.transitions++,
    };
    const services = {
        userManager: { sessionAtom },
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
        setTimeout,
        clearTimeout,
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
        AudioContext: class {
            state = "suspended";
            constructor() {
                activation.keepalives++;
            }
            createOscillator() {
                return {
                    frequency: {},
                    connect() {},
                    start() {},
                    stop() {},
                    disconnect() {},
                };
            }
            createGain() {
                return { gain: {}, connect() {}, disconnect() {} };
            }
            addEventListener() {}
            resume() {
                return resumeKeepalive ? resumeKeepalive() : Promise.resolve();
            }
            close() {
                activation.closed++;
                return Promise.resolve();
            }
        },
        Audio: class {
            play() {
                return Promise.resolve();
            }
            pause() {}
            removeAttribute() {}
            load() {}
        },
        console,
    });
    vm.runInContext(outputFiles[0].text, context);
    const manager = new context.sessionModule.MediaSessionManager(services);
    const lifecycle = new context.sessionModule.PlaybackLifecycle(services);
    if (initialize) manager.init();
    return {
        manager,
        lifecycle,
        services,
        activation,
        sessionAtom,
        documentListeners,
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

test("media session initialization is idempotent and restartable", () => {
    const e = setup();
    e.manager.init();
    assert.equal(e.currentMedia.listenerCount, 1);
    assert.equal(e.playingAtom.listenerCount, 1);
    assert.equal(e.currentTimeAtom.listenerCount, 1);
    assert.equal(e.documentHandlers.size, 1);
    e.manager.destroy();
    e.manager.destroy();
    assert.equal(e.session.metadata, null);
    assert.equal(e.session.playbackState, "none");
    assert.equal(e.currentMedia.listenerCount, 0);
    assert.equal(e.handlers.get("play"), null);
    e.manager.init();
    assert.equal(e.currentMedia.listenerCount, 1);
    assert.equal(e.session.metadata.title, "first");
    e.handlers.get("play")();
    assert.equal(e.transport.play, 1);
    e.manager.destroy();
});

test("native handlers use their injected queue and player", () => {
    const first = setup();
    const second = setup();
    first.handlers.get("nexttrack")();
    first.handlers.get("seekto")({ seekTime: 15 });
    second.handlers.get("previoustrack")();
    assert.equal(first.transport.next, 1);
    assert.equal(first.transport.seek, 1);
    assert.equal(second.transport.next, 0);
    assert.equal(second.transport.seek, 0);
    assert.equal(second.transport.previous, 1);
    assert.equal(first.transport.previous, 0);
    first.manager.destroy();
    second.manager.destroy();
});

test("constructing playback lifecycle installs no listeners or native handlers", () => {
    const e = setup({ initialize: false });
    assert.equal(e.sessionAtom.listenerCount, 0);
    assert.equal(e.currentMedia.listenerCount, 0);
    assert.equal(e.handlers.size, 0);
    for (const listeners of e.documentListeners.values())
        assert.equal(listeners.size, 0);
    assert.equal(e.activation.settings, 0);
    assert.equal(e.activation.keepalives, 0);
});

test("lifecycle waits for a session and balances Strict Mode setup cleanup setup", () => {
    const e = setup({ initialize: false, sessionSnapshot: undefined });
    e.sessionAtom.set(undefined);
    e.lifecycle.start();
    e.lifecycle.start();
    assert.equal(e.sessionAtom.listenerCount, 2);
    assert.equal(e.currentMedia.listenerCount, 0);
    e.sessionAtom.set({ username: "fixture" });
    assert.equal(e.currentMedia.listenerCount, 1);
    assert.equal(e.documentListeners.get("pointerup").size, 1);
    e.lifecycle.stop();
    e.lifecycle.stop();
    assert.equal(e.sessionAtom.listenerCount, 0);
    assert.equal(e.currentMedia.listenerCount, 0);
    for (const listeners of e.documentListeners.values())
        assert.equal(listeners.size, 0);
    e.lifecycle.start();
    assert.equal(e.sessionAtom.listenerCount, 2);
    assert.equal(e.currentMedia.listenerCount, 1);
    assert.equal(e.session.metadata.title, "first");
    assertTransportUntouched(e);
    e.lifecycle.stop();
});

test("session refresh retains subscriptions and only the first gesture activates audio", () => {
    const e = setup({ initialize: false });
    e.lifecycle.start();
    e.sessionAtom.set({ username: "fixture", volume: 0.5 });
    assert.equal(e.activation.settings, 1);
    assert.equal(e.currentMedia.listenerCount, 1);
    assert.equal(e.activation.keepalives, 0);
    for (const handler of e.documentListeners.get("pointerup")) handler();
    assert.equal(e.activation.transitions, 1);
    assert.equal(e.activation.keepalives, 1);
    assert.equal(e.documentListeners.get("pointerup").size, 0);
    assert.equal(e.documentListeners.get("keydown").size, 0);
    assertTransportUntouched(e);
    e.lifecycle.stop();
    assert.equal(e.activation.closed, 1);
});

test("logout immediately removes native controls and gestures and pauses playback", () => {
    const e = setup({ initialize: false });
    e.lifecycle.start();
    e.sessionAtom.set(null);
    assert.equal(e.transport.pause, 1);
    assert.equal(e.session.metadata, null);
    assert.equal(e.session.playbackState, "none");
    assert.equal(e.currentMedia.listenerCount, 0);
    assert.equal(e.handlers.get("play"), null);
    for (const listeners of e.documentListeners.values())
        assert.equal(listeners.size, 0);
    e.lifecycle.stop();
    assert.equal(e.sessionAtom.listenerCount, 0);
});

test("late keepalive recovery cannot restart audio after cleanup or tear down a replacement", async () => {
    let rejectResume;
    const e = setup({
        initialize: false,
        resumeKeepalive: () =>
            new Promise((_, reject) => {
                rejectResume = reject;
            }),
    });
    e.lifecycle.start();
    for (const handler of e.documentListeners.get("pointerup")) handler();
    e.document.hidden = false;
    for (const handler of e.documentHandlers) handler();
    e.lifecycle.stop();
    e.lifecycle.start();
    for (const handler of e.documentListeners.get("keydown")) handler();
    assert.equal(e.activation.keepalives, 2);
    rejectResume(new Error("Old audio context closed"));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(e.activation.keepalives, 2);
    assert.equal(e.activation.closed, 1);
    e.lifecycle.stop();
    assert.equal(e.activation.closed, 2);
});
