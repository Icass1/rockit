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
function setup({ connected = false, sameAlbum = false } = {}) {
    let level = 0.3,
        serial = 0,
        repeat = "OFF";
    const messages = [],
        handlers = new Map(),
        timers = new Map();
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
        play() {
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
    const document = {
        hidden: false,
        createElement: () => new Element(),
        addEventListener() {},
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
        setTimeout: (fn) => {
            timers.set(++serial, fn);
            return serial;
        },
        clearTimeout: (id) => timers.delete(id),
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
            onMessage: (n, fn) => handlers.set(n, fn),
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
    player.init();
    return {
        player,
        queue,
        timers,
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

test("file errors advance without a timer, skip unavailable songs, and stop a failed-file loop", () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.queue.lastNavigationDirection = 1;
    e.queue.queue[1].media.downloaded = false;
    const played = [];
    let pauses = 0;
    e.player.play = () => played.push(e.queue.currentQueueMediaId);
    e.player.pause = () => pauses++;
    const timerCount = e.timers.size;
    e.player._handleMediaError();
    assert.deepEqual(played, [3]);
    assert.equal(e.timers.size, timerCount);
    e.player._handleMediaError();
    assert.deepEqual(played, [3]);
    assert.equal(pauses, 1);
});
test("backward error navigation skips unavailable songs in the correct direction", () => {
    const e = setup();
    e.queue.queueIdentity = {};
    e.queue.lastNavigationDirection = -1;
    e.queue.setQueueMediaId(3);
    e.queue.queue[1].media.downloaded = false;
    const played = [];
    e.player.play = () => played.push(e.queue.currentQueueMediaId);
    e.player._handleMediaError();
    assert.deepEqual(played, [1]);
});
