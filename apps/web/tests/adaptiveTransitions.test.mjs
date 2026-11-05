/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {MediaPlayerManager} from './lib/managers/mediaPlayerManager';
 export {setRockIt} from '../../packages/shared/src/rockit/rockitRef';
 export {transitionDuration} from './lib/audio/transitionMixer';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "offline",
            setup(b) {
                b.onResolve({ filter: /^@\/lib\/offline\/store$/ }, () => ({
                    path: "offline",
                    namespace: "mock",
                }));
                b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
                    contents:
                        "export const resolveOfflineAudioUrl=async()=>undefined;",
                }));
            },
        },
    ],
});
async function flush() {
    for (let i = 0; i < 40; i++) await Promise.resolve();
}
function setup({
    connected = false,
    sameAlbum = false,
    browserLifecycle = true,
    initializePlayer = true,
} = {}) {
    let level = 0.3,
        serial = 0,
        repeat = "OFF";
    const messages = [],
        handlers = new Map(),
        timers = new Map(),
        timeoutDue = new Map();
    let clock = 0;
    class Param {
        value = 1;
        curves = [];
        cancelScheduledValues() {
            this.curves = [];
        }
        setValueAtTime(v) {
            this.value = v;
        }
        setValueCurveAtTime(curve, at, seconds) {
            this.curves.push({ curve, at, seconds });
        }
    }
    class Node {
        gain = new Param();
        frequency = new Param();
        Q = new Param();
        connect() {}
        disconnect() {}
        getFloatTimeDomainData(a) {
            a.fill(level);
        }
    }
    const sources = new WeakSet();
    class Context {
        state = "running";
        currentTime = 0;
        destination = new Node();
        createGain() {
            return new Node();
        }
        createAnalyser() {
            return new Node();
        }
        createBiquadFilter() {
            return new Node();
        }
        createMediaElementSource(el) {
            assert.ok(!sources.has(el), "duplicate source");
            sources.add(el);
            return new Node();
        }
        resume() {
            return Promise.resolve();
        }
    }
    class Element {
        paused = true;
        currentTime = 0;
        duration = 60;
        readyState = 4;
        muted = false;
        volume = 1;
        src = "";
        srcObject = null;
        style = {};
        buffered = { length: 1, start: () => 0, end: () => 10 };
        playCalls = 0;
        play() {
            this.playCalls++;
            this.paused = false;
            this.onplaying?.();
            return Promise.resolve();
        }
        pause() {
            this.paused = true;
            this.onpause?.();
        }
        load() {}
        setAttribute(n, v) {
            this[n] = v;
        }
        hasAttribute(n) {
            return n === "src" && !!this.src;
        }
        removeAttribute(n) {
            if (n === "src") this.src = "";
        }
    }
    const documentListeners = new Map();
    const document = {
        hidden: false,
        createElement: () => new Element(),
        addEventListener(name, handler) {
            if (!documentListeners.has(name))
                documentListeners.set(name, new Set());
            documentListeners.get(name).add(handler);
        },
        removeEventListener(name, handler) {
            documentListeners.get(name)?.delete(handler);
        },
        getElementById: () => null,
        body: { appendChild() {} },
    };
    const storage = new Map();
    const ctx = vm.createContext({
        process: { env: {} },
        window: {
            localStorage: {
                setItem: (k, v) => storage.set(k, v),
                getItem: (k) => storage.get(k),
            },
        },
        document,
        navigator: { userAgent: "iPhone" },
        Audio: Element,
        AudioContext: Context,
        HTMLMediaElement: { HAVE_CURRENT_DATA: 2 },
        console,
        URL,
        setInterval: (fn) => {
            timers.set(++serial, fn);
            return serial;
        },
        clearInterval: (id) => timers.delete(id),
        setTimeout: (fn, delay = 0) => {
            timers.set(++serial, fn);
            timeoutDue.set(serial, clock + delay);
            return serial;
        },
        clearTimeout: (id) => {
            timers.delete(id);
            timeoutDue.delete(id);
        },
    });
    vm.runInContext(outputFiles[0].text, ctx);
    const { MediaPlayerManager, setRockIt, transitionDuration } = ctx.module;
    const items = ["a", "b", "c"].map((id, i) => ({
        queueMediaId: i + 1,
        media: {
            type: "song",
            publicId: id,
            audioUrl: "https://test/" + id,
            duration_ms: 60000,
            downloaded: true,
            album: { publicId: sameAlbum ? "album" : id },
        },
    }));
    const queue = {
        queue: items,
        currentQueueMediaId: 1,
        currentMedia: items[0].media,
        peekNextQueueItem() {
            return items[this.currentQueueMediaId % items.length];
        },
        setQueueMediaId(id) {
            this.currentQueueMediaId = id;
            this.currentMedia = items[id - 1].media;
        },
    };
    const player = new MediaPlayerManager();
    setRockIt({
        queueManager: queue,
        webSocketManager: {
            isConnected: connected,
            onMessage: (n, fn) => {
                assert.equal(handlers.has(n), false);
                handlers.set(n, fn);
            },
            offMessage: (n, fn) => {
                if (handlers.get(n) === fn) handlers.delete(n);
            },
            sendCurrentMedia: (d) => messages.push({ kind: "current", ...d }),
            sendMediaEnded: (d) => messages.push({ kind: "ended", ...d }),
            sendCurrentTime() {},
            sendSeek() {},
        },
        userManager: {
            queueTypeAtom: { get: () => "SORTED" },
            repeatModeAtom: { get: () => repeat },
        },
        bookmarkManager: { currentMediaBookmarksAtom: { get: () => [] } },
        notificationManager: { notifyError() {} },
        vocabularyManager: {
            vocabulary: { ERROR_LOADING_MEDIA_FILE: "file unavailable" },
        },
    });
    if (initializePlayer) player.init();
    if (browserLifecycle) player.startBrowserLifecycle();
    return {
        document,
        documentListeners,
        player,
        queue,
        timers,
        async advanceTime(ms) {
            const target = clock + ms;
            while (true) {
                const next = [...timeoutDue]
                    .filter(([, due]) => due <= target)
                    .sort((a, b) => a[1] - b[1])[0];
                if (!next) break;
                const [id, due] = next;
                clock = due;
                const fn = timers.get(id);
                timeoutDue.delete(id);
                timers.delete(id);
                fn();
                await flush();
            }
            clock = target;
        },
        handlers,
        messages,
        transitionDuration,
        setLevel: (v) => {
            level = v;
        },
        setRepeat: (v) => {
            repeat = v;
        },
        async grant() {
            const data = messages.filter((m) => m.kind === "current").at(-1);
            assert.ok(data);
            for (const fn of handlers.values())
                if (fn.constructor.name === "AsyncFunction")
                    await fn({ ...data, isPlaybackOwner: true });
            await flush();
        },
    };
}
async function start(env) {
    env.player.configureTransitions({ enabled: true, preserveAlbum: false });
    await env.player.setMedia();
    env.player.play();
    await flush();
    if (!env.player.playingAtom.get()) await env.grant();
    await flush();
}
async function approachEnd(env) {
    const old = env.player.audioElement;
    for (let t = 40; t < 57; t += 0.25) {
        env.setLevel(t < 48 ? 0.3 : 0.03);
        old.currentTime = t;
        old.ontimeupdate();
    }
    await flush();
    return old;
}

for (const seconds of [5, 6])
    test(
        "custom " +
            seconds +
            "-second overlap starts at the requested time without energy history",
        async () => {
            const e = setup();
            await start(e);
            e.player.configureTransitions({ maxSeconds: seconds });
            assert.equal(
                e.player.transitionSettingsAtom.get().maxSeconds,
                seconds
            );
            const old = e.player.audioElement;
            old.currentTime = 60 - seconds - 0.25;
            old.ontimeupdate();
            await flush();
            assert.equal(e.queue.currentQueueMediaId, 1);
            old.currentTime = 60 - seconds;
            old.ontimeupdate();
            await flush();
            assert.equal(e.queue.currentQueueMediaId, 2);
            const deck = e.player._mixer._decks.get(old);
            assert.equal(deck.high.gain.curves.at(-1).seconds, seconds);
            e.player.pause();
        }
    );
test("long overlaps respect short incoming tracks and require enough buffered audio", async () => {
    const e = setup();
    await start(e);
    e.player.configureTransitions({ maxSeconds: 20 });
    const old = e.player.audioElement;
    const incoming = e.player._preloadAudio;
    incoming.duration = 12;
    incoming.buffered = { length: 1, start: () => 0, end: () => 5 };
    old.currentTime = 54;
    old.ontimeupdate();
    await flush();
    assert.equal(e.queue.currentQueueMediaId, 1);
    incoming.buffered = { length: 1, start: () => 0, end: () => 8 };
    old.ontimeupdate();
    await flush();
    assert.equal(e.queue.currentQueueMediaId, 2);
    const deck = e.player._mixer._decks.get(old);
    assert.equal(deck.high.gain.curves.at(-1).seconds, 6);
    e.player.pause();
});
test("handoff promotes buffered audio once and preserves the outgoing tail", async () => {
    const e = setup();
    await start(e);
    const old = await approachEnd(e);
    assert.equal(e.queue.currentQueueMediaId, 2);
    assert.notEqual(e.player.audioElement, old);
    assert.equal(old.paused, false);
    assert.equal(e.player.audioElement.paused, false);
    assert.equal(e.player.audioElement.src, "https://test/b");
    assert.equal(e.messages.filter((m) => m.kind === "ended").length, 1);
    old.onended();
    assert.equal(e.queue.currentQueueMediaId, 2);
    assert.equal(old.paused, true);
    e.player.pause();
});
test("incoming awaits server grant and revocation pauses both decks", async () => {
    const e = setup({ connected: true });
    await start(e);
    const old = await approachEnd(e);
    assert.equal(e.queue.currentQueueMediaId, 2);
    assert.equal(old.paused, false);
    assert.equal(e.player.audioElement.paused, true);
    await e.grant();
    assert.equal(e.player.audioElement.paused, false);
    for (const fn of e.handlers.values())
        if (fn.constructor.name === "AsyncFunction")
            await fn({ isPlaybackOwner: false });
    assert.equal(old.paused, true);
    assert.equal(e.player.audioElement.paused, true);
});
for (const action of ["pause", "seek", "skip", "disable"])
    test(`${action} cancels the outgoing deck`, async () => {
        const e = setup();
        await start(e);
        const old = await approachEnd(e);
        if (action === "pause") e.player.pause();
        if (action === "seek") e.player.setCurrentTime(20, false);
        if (action === "skip") {
            e.queue.setQueueMediaId(3);
            await e.player.setMedia();
            e.player.play();
            await flush();
        }
        if (action === "disable")
            e.player.configureTransitions({ enabled: false });
        assert.equal(old.paused, true);
        if (action === "skip")
            assert.equal(e.player.audioElement.src, "https://test/c");
        e.player.pause();
    });
test("album protection, insufficient buffering and repeat-one avoid early handoff", async () => {
    for (const mode of ["album", "buffer", "repeat", "remote"]) {
        const e = setup({ sameAlbum: true });
        await start(e);
        if (mode === "album")
            e.player.configureTransitions({ preserveAlbum: true });
        if (mode === "buffer") e.player._preloadAudio.buffered = { length: 0 };
        if (mode === "repeat") e.setRepeat("ONE");
        if (mode === "remote") e.player._syncOwner = false;
        const old = await approachEnd(e);
        assert.equal(e.queue.currentQueueMediaId, 1, mode);
        assert.equal(e.player.audioElement, old);
        e.player.pause();
    }
});
test("disabled mode restores a native element at the next track", async () => {
    const e = setup();
    await start(e);
    const first = e.player.audioElement;
    e.player.configureTransitions({ enabled: false });
    e.queue.setQueueMediaId(2);
    await e.player.setMedia();
    assert.notEqual(e.player.audioElement, first);
    assert.equal(e.player.audioElement.crossOrigin, undefined);
    e.player.pause();
});

test("initial waiting retains the tail; an audible stall stops it", async () => {
    const e = setup({ connected: true });
    await start(e);
    const old = await approachEnd(e);
    e.player.audioElement.onwaiting();
    assert.equal(old.paused, false);
    await e.grant();
    e.player.audioElement.onwaiting();
    assert.equal(old.paused, true);
    assert.equal(e.queue.currentQueueMediaId, 2);
    e.player.pause();
});

test("a late server grant after the outgoing end does not skip twice", async () => {
    const e = setup({ connected: true });
    await start(e);
    const old = await approachEnd(e);
    old.onended();
    await flush();
    assert.equal(e.queue.currentQueueMediaId, 2);
    await e.grant();
    assert.equal(e.player.audioElement.paused, false);
    assert.equal(e.messages.filter((m) => m.kind === "ended").length, 1);
    e.player.pause();
});

test("the retired deck preloads the following song and supports another handoff", async () => {
    const e = setup();
    await start(e);
    const first = await approachEnd(e);
    first.onended();
    await flush();
    assert.equal(e.player._preloadAudio.src, "https://test/c");
    const second = await approachEnd(e);
    assert.equal(e.queue.currentQueueMediaId, 3);
    assert.equal(second.paused, false);
    assert.equal(e.messages.filter((m) => m.kind === "ended").length, 2);
    e.player.pause();
});

test("a routed stream error retries once on a native element", async () => {
    const e = setup();
    await start(e);
    const routed = e.player.audioElement;
    routed.onerror(new Error("CORS rejected"));
    const native = e.player.audioElement;
    assert.notEqual(native, routed);
    assert.equal(native.src, "https://test/a");
    assert.equal(native.crossOrigin, undefined);
    native.onloadedmetadata();
    await flush();
    assert.equal(native.paused, false);
    assert.equal(e.queue.currentQueueMediaId, 1);
    e.player.pause();
});

test("videos retain native background audio when transitions are enabled", async () => {
    const e = setup();
    await start(e);
    const previous = e.player.audioElement;
    e.queue.currentMedia = {
        type: "video",
        publicId: "video",
        audioUrl: "https://test/audio",
        videoUrl: "https://test/video",
        duration_ms: 60000,
    };
    e.queue.currentQueueMediaId = 7;
    await e.player.setMedia();
    assert.notEqual(e.player.audioElement, previous);
    assert.equal(e.player.audioElement.crossOrigin, undefined);
    assert.equal(e.player.audioElement.src, "https://test/audio");
    e.player.pause();
});

test("file errors wait before skipping unavailable songs and stop a failed-file loop", async () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.queue.lastNavigationDirection = 1;
    e.queue.queue[1].media.downloaded = false;
    const played = [];
    let pauses = 0;
    e.player.play = () => played.push(e.queue.currentQueueMediaId);
    e.player.pause = () => pauses++;
    e.player._playRequested = true;
    const timerCount = e.timers.size;
    e.player._handleMediaError();
    assert.deepEqual(played, []);
    assert.equal(e.queue.currentQueueMediaId, 1);
    assert.equal(e.timers.size, timerCount + 1);
    await e.advanceTime(59_999);
    assert.deepEqual(played, []);
    await e.advanceTime(1);
    assert.deepEqual(played, [3]);
    assert.equal(e.timers.size, timerCount);
    e.player._handleMediaError();
    assert.deepEqual(played, [3]);
    assert.equal(pauses, 1);
});
test("backward error navigation waits before skipping unavailable songs in the correct direction", async () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.queue.lastNavigationDirection = -1;
    e.queue.setQueueMediaId(3);
    e.queue.queue[1].media.downloaded = false;
    const played = [];
    e.player.play = () => played.push(e.queue.currentQueueMediaId);
    e.player._playRequested = true;
    e.player._handleMediaError();
    await e.advanceTime(59_999);
    assert.deepEqual(played, []);
    assert.equal(e.queue.currentQueueMediaId, 3);
    await e.advanceTime(1);
    assert.deepEqual(played, [1]);
});

for (const action of [
    "pause",
    "selection",
    "queue replacement",
    "playback replacement",
])
    test(`delayed file-error navigation yields to ${action}`, async () => {
        const e = setup();
        e.queue.queueIdentity = {};
        e.queue.lastNavigationDirection = 1;
        e.player._playRequested = true;
        let plays = 0;
        e.player.play = () => plays++;
        e.player._handleMediaError();
        if (action === "pause") e.player.pause();
        if (action === "selection") e.queue.setQueueMediaId(3);
        if (action === "queue replacement") e.queue.queueIdentity = {};
        if (action === "playback replacement")
            e.player._playbackId = "replacement";
        const selectedId = e.queue.currentQueueMediaId;
        await e.advanceTime(60_000);
        assert.equal(e.queue.currentQueueMediaId, selectedId);
        assert.equal(plays, 0);
    });

test("repeat-one file errors retry the same song after one second", async () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.player._playRequested = true;
    e.setRepeat("ONE");
    let loads = 0,
        plays = 0;
    e.player.setMedia = async () => loads++;
    e.player.play = () => plays++;
    e.player._handleMediaError();
    await e.advanceTime(999);
    assert.equal(loads, 0);
    await e.advanceTime(1);
    assert.equal(loads, 1);
    assert.equal(plays, 1);
    assert.equal(e.queue.currentQueueMediaId, 1);
});

test("native resource duration keeps the playback clock moving beyond catalog length", async () => {
    const e = setup();
    await start(e);
    const audio = e.player.audioElement;
    audio.duration = 315;
    audio.onloadedmetadata();
    assert.equal(e.player.durationAtom.get(), 315);
    audio.currentTime = 305;
    audio.ontimeupdate();
    assert.equal(e.player.currentTime, 305);
    audio.duration = 320;
    audio.ondurationchange();
    assert.equal(e.player.durationAtom.get(), 320);
    e.player.pause();
});

test("player construction installs no visibility listener; the shell balances browser setup and cleanup", () => {
    const e = setup({ browserLifecycle: false, initializePlayer: false });
    assert.equal(e.documentListeners.get("visibilitychange")?.size ?? 0, 0);
    e.player.startBrowserLifecycle();
    e.player.startBrowserLifecycle();
    assert.equal(e.documentListeners.get("visibilitychange").size, 1);
    e.player.stopBrowserLifecycle();
    e.player.stopBrowserLifecycle();
    assert.equal(e.documentListeners.get("visibilitychange").size, 0);
    e.player.startBrowserLifecycle();
    assert.equal(e.documentListeners.get("visibilitychange").size, 1);
    e.player.stopBrowserLifecycle();
});

test("visibility cleanup cancels iOS ended polling and late callbacks cannot advance playback", () => {
    const e = setup({ initializePlayer: false });
    const handler = [...e.documentListeners.get("visibilitychange")][0];
    e.document.hidden = true;
    handler();
    assert.equal(e.timers.size, 1);
    const poll = [...e.timers.values()][0];
    const audio = e.player.audioElement;
    audio.paused = false;
    audio.currentTime = audio.duration;
    let ended = 0;
    e.player.onNativeEnded = () => ended++;
    e.player.stopBrowserLifecycle();
    assert.equal(e.timers.size, 0);
    poll();
    handler();
    assert.equal(ended, 0);
    assert.equal(e.timers.size, 0);
    assert.equal(audio.paused, false);
    e.player.startBrowserLifecycle();
    assert.equal(e.timers.size, 0);
    handler();
    assert.equal(e.timers.size, 1);
    poll();
    assert.equal(ended, 0);
    e.document.hidden = false;
    e.player.activateTransitionsOnGesture = () => {};
    e.player.preloadNextTrack = async () => {};
    handler();
    assert.equal(e.timers.size, 0);
    e.player.stopBrowserLifecycle();
});

test("autoplay retries have one gesture owner and cannot play after cleanup or supersession", () => {
    const e = setup({ initializePlayer: false });
    const player = e.player,
        audio = player.audioElement;
    player._playRequested = true;
    player._syncOwner = true;
    player._retryPlayOnGesture("audio");
    const old = [...e.documentListeners.get("pointerup")][0];
    player._retryPlayOnGesture("audio");
    assert.equal(e.documentListeners.get("pointerup").size, 1);
    assert.equal(e.documentListeners.get("keydown").size, 1);
    old();
    assert.equal(audio.playCalls, 0);
    assert.equal(e.documentListeners.get("pointerup").size, 1);
    const current = [...e.documentListeners.get("pointerup")][0];
    current();
    assert.equal(audio.playCalls, 1);
    assert.equal(e.documentListeners.get("pointerup").size, 0);
    assert.equal(e.documentListeners.get("keydown").size, 0);
    audio.paused = true;
    player._retryPlayOnGesture("audio");
    const late = [...e.documentListeners.get("pointerup")][0];
    player.stopBrowserLifecycle();
    late();
    assert.equal(audio.playCalls, 1);
    assert.equal(e.documentListeners.get("pointerup").size, 0);
    player._retryPlayOnGesture("audio");
    assert.equal(e.documentListeners.get("pointerup").size, 0);
    player.startBrowserLifecycle();
    late();
    assert.equal(audio.playCalls, 1);
    player.stopBrowserLifecycle();
});

test("shared player synchronization balances socket and visibility handlers across restarts", () => {
    const e = setup();
    e.player.init();
    assert.equal(e.handlers.size, 2);
    assert.equal(e.documentListeners.get("visibilitychange").size, 2);
    e.player.stopSynchronization();
    e.player.stopSynchronization();
    assert.equal(e.handlers.size, 0);
    assert.equal(e.documentListeners.get("visibilitychange").size, 1);
    e.player.init();
    e.player.init();
    assert.equal(e.handlers.size, 2);
    assert.equal(e.documentListeners.get("visibilitychange").size, 2);
    e.player.stopSynchronization();
    e.player.stopBrowserLifecycle();
    assert.equal(e.documentListeners.get("visibilitychange").size, 0);
});

test("old ownership callbacks cannot pause or resume a restarted synchronization scope", async () => {
    const e = setup();
    const old = e.handlers.get("current_media");
    e.player._playbackId = "same";
    const pending = old({ isPlaybackOwner: true, playbackId: "same" });
    e.player.stopSynchronization();
    e.player.init();
    e.player._syncOwner = false;
    await pending;
    assert.equal(e.player._syncOwner, false);
    e.player.audioElement.paused = false;
    await old({ isPlaybackOwner: false, playbackId: "same" });
    assert.equal(e.player.audioElement.paused, false);
    assert.equal(e.player.audioElement.playCalls, 0);
    e.player.stopSynchronization();
    e.player.stopBrowserLifecycle();
});

test("pending media-load acknowledgements and remote clocks cannot cross synchronization cleanup", async () => {
    const e = setup();
    let finish;
    e.player._playbackId = "same";
    e.player._pendingPlaybackId = "same";
    e.player._mediaLoadPromise = new Promise((resolve) => {
        finish = resolve;
    });
    const pending = e.handlers.get("current_media")({
        isPlaybackOwner: true,
        playbackId: "same",
    });
    const oldTime = e.handlers.get("current_time");
    await flush();
    e.player.stopSynchronization();
    e.player.init();
    e.player._syncOwner = false;
    finish();
    await pending;
    assert.equal(e.player.audioElement.playCalls, 0);
    const message = {
        mediaPublicId: "a",
        queueMediaId: 1,
        playbackId: "same",
        currentTimeMs: 7000,
    };
    oldTime(message);
    assert.equal(e.player.currentTime, 0);
    e.handlers.get("current_time")(message);
    assert.equal(e.player.currentTime, 7);
    e.player.stopSynchronization();
    e.player.stopBrowserLifecycle();
});

function pendingResult() {
    let resolve;
    const promise = new Promise((yes) => {
        resolve = yes;
    });
    return { promise, resolve };
}

test("cleanup rejects a late source lookup without installing or playing it", async () => {
    const e = setup(),
        lookup = pendingResult();
    e.player.resolveMediaUriAsync = () => lookup.promise;
    e.player.play();
    await flush();
    assert.equal(e.player._loadingPlayback, true);
    e.player.stopSynchronization();
    e.player.stopBrowserLifecycle();
    lookup.resolve("https://test/stale");
    await flush();
    assert.equal(e.player.audioElement.src, "");
    assert.equal(e.player.audioElement.playCalls, 0);
    assert.equal(e.player._loadingPlayback, false);
});

test("an interrupted source load restarts without waiting for the old lookup", async () => {
    const e = setup(),
        reads = [];
    e.player.resolveMediaUriAsync = () => {
        const read = pendingResult();
        reads.push(read);
        return read.promise;
    };
    e.player.play();
    await flush();
    assert.equal(reads.length, 1);
    e.player.stopSynchronization();
    e.player.stopBrowserLifecycle();
    e.player.init();
    e.player.startBrowserLifecycle();
    await flush();
    assert.equal(reads.length, 2);
    reads[0].resolve("https://test/obsolete");
    await flush();
    assert.equal(e.player._loadingPlayback, true);
    assert.equal(e.player.audioElement.src, "");
    reads[1].resolve("https://test/fresh");
    await flush();
    assert.equal(e.player.audioElement.src, "https://test/fresh");
    assert.equal(e.player.audioElement.playCalls, 1);
    assert.equal(e.player._loadingPlayback, false);
    e.player.pause();
});

test("a replaced queue or logout cannot resume an interrupted source load", async () => {
    for (const sameId of [false, true]) {
        const e = setup(),
            lookup = pendingResult();
        let reads = 0;
        e.player.resolveMediaUriAsync = () => {
            reads++;
            return lookup.promise;
        };
        e.player.play();
        await flush();
        e.player.stopSynchronization();
        e.player.pause();
        if (sameId) e.queue.currentMedia = { ...e.queue.currentMedia };
        else e.queue.setQueueMediaId(2);
        e.player.init();
        await flush();
        lookup.resolve("https://test/old-account");
        await flush();
        assert.equal(reads, 1);
        assert.equal(e.player.audioElement.src, "");
        assert.equal(e.player.audioElement.playCalls, 0);
    }
});

test("cleanup during native loading rejects post-load seek, volume and post-load hooks", async () => {
    const e = setup(),
        native = pendingResult();
    const effects = [];
    e.player.loadNativeSource = () => native.promise;
    e.player.setNativeVolume = () => effects.push("volume");
    e.player.seekNative = () => effects.push("seek");
    e.player.afterMediaLoadedAsync = async () => effects.push("after");
    const loading = e.player.setMedia();
    await flush();
    e.player.stopSynchronization();
    native.resolve();
    await loading;
    assert.deepEqual(effects, []);
});

test("cleanup and a later play cannot revive an old delayed file-error skip", async () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.queue.lastNavigationDirection = 1;
    e.player._playRequested = true;
    e.player._handleMediaError();
    const old = [...e.timers.values()][0];
    e.player.stopSynchronization();
    assert.equal(e.timers.size, 0);
    e.player.init();
    e.player._playRequested = true;
    old();
    assert.equal(e.queue.currentQueueMediaId, 1);
    assert.equal(e.player.audioElement.playCalls, 0);
});

test("repeat-one errors share one cancellable retry timer", async () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.player._playRequested = true;
    e.setRepeat("ONE");
    e.player._handleMediaError();
    const old = [...e.timers.values()][0];
    e.player._handleMediaError();
    assert.equal(e.timers.size, 1);
    old();
    e.player.pause();
    assert.equal(e.timers.size, 0);
    await e.advanceTime(1000);
    assert.equal(e.player.audioElement.playCalls, 0);
});

test("late toggle and audio-only continuations cannot affect a different selected item", async () => {
    for (const mode of ["toggle", "audio-only"]) {
        const e = setup(),
            loading = pendingResult();
        e.player.setMedia = () => loading.promise;
        let plays = 0,
            seeks = 0;
        e.player.play = () => plays++;
        e.player.setCurrentTime = () => seeks++;
        if (mode === "audio-only") {
            e.queue.currentMedia = {
                type: "video",
                publicId: "video",
                audioUrl: "https://test/audio",
                videoUrl: "https://test/video",
            };
            e.player._playingAtom.set(true);
        }
        const pending =
            mode === "toggle"
                ? e.player._togglePlayPauseOrSetMedia()
                : e.player.setAudioOnly(true);
        e.queue.setQueueMediaId(2);
        loading.resolve();
        await pending;
        assert.equal(plays + seeks, 0);
    }
});

test("late autoplay completion cannot change a restarted player's playing state", async () => {
    const e = setup(),
        autoplay = pendingResult();
    e.queue.setQueueMediaId(3);
    e.queue.queueIdentity = {};
    e.queue.startAutoplayAsync = () => autoplay.promise;
    e.player._playbackMediaId = "c";
    e.player._playbackQueueId = 3;
    e.player._syncOwner = true;
    e.player._playRequested = true;
    e.player._playingAtom.set(true);
    e.player._handleEnded();
    e.player.stopSynchronization();
    e.player.init();
    autoplay.resolve(false);
    await flush();
    assert.equal(e.player.playingAtom.get(), true);
    assert.equal(e.player.audioElement.playCalls, 0);
});

test("rapid cleanup/restart cycles retain a single interrupted-load recovery", async () => {
    const e = setup(),
        reads = [];
    e.player.resolveMediaUriAsync = () => {
        const read = pendingResult();
        reads.push(read);
        return read.promise;
    };
    e.player.play();
    await flush();
    for (let i = 0; i < 3; i++) {
        e.player.stopSynchronization();
        e.player.init();
    }
    await flush();
    assert.equal(reads.length, 2);
    reads[1].resolve("https://test/resumed");
    await flush();
    assert.equal(e.player.audioElement.src, "https://test/resumed");
    assert.equal(e.player.audioElement.playCalls, 1);
    reads[0].resolve("https://test/old");
    await flush();
    assert.equal(e.player.audioElement.src, "https://test/resumed");
    e.player.pause();
});

test("interrupted saved-state loading restores its position without starting playback", async () => {
    const e = setup(),
        reads = [];
    e.player.resolveMediaUriAsync = () => {
        const read = pendingResult();
        reads.push(read);
        return read.promise;
    };
    e.player._currentTimeAtom.set(8);
    const pending = e.player.setMedia(false, "remote-playback", 8000, false);
    await flush();
    e.player.stopSynchronization();
    e.player.init();
    await flush();
    reads[1].resolve("https://test/saved");
    await flush();
    assert.equal(e.player.audioElement.currentTime, 8);
    assert.equal(e.player.audioElement.playCalls, 0);
    reads[0].resolve("https://test/obsolete");
    await pending;
    assert.equal(e.queue.currentQueueMediaId, 1);
});
