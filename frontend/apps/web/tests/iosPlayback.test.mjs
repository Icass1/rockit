/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export { MediaPlayerManager } from './lib/managers/mediaPlayerManager';
                   export { setRockIt } from '../../packages/shared/src/rockit/rockitRef';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "playerModule",
    define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.NEXT_PUBLIC_BACKEND_URL": '"https://test"',
    },
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "offline-store",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/offline\/store$/ },
                    () => ({ path: "offline", namespace: "mock" })
                );
                builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
                    contents:
                        "export const resolveOfflineAudioUrl = async () => undefined;",
                }));
            },
        },
    ],
});

function setup(userAgent = "iPhone") {
    const listeners = new Map();
    class Element {
        paused = true;
        currentTime = 0;
        duration = 120;
        readyState = 4;
        muted = false;
        volume = 1;
        srcObject = null;
        parentElement = null;
        playCalls = 0;
        src = "";
        setAttribute(name, value) {
            this[name] = value;
        }
        hasAttribute(name) {
            return name === "src" && !!this.src;
        }
        removeAttribute(name) {
            if (name === "src") this.src = "";
        }
        load() {}
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
        appendChild(child) {
            child.parentElement = this;
            child.isConnected = true;
        }
        style = {};
    }
    const root = new Element();
    const document = {
        hidden: false,
        createElement: () => new Element(),
        getElementById: () => root,
        body: root,
        addEventListener(name, listener) {
            const entries = listeners.get(name) ?? [];
            entries.push(listener);
            listeners.set(name, entries);
        },
    };
    const context = vm.createContext({
        process: { env: {} },
        window: {},
        document,
        Audio: Element,
        HTMLMediaElement: { HAVE_CURRENT_DATA: 2 },
        navigator: { userAgent },
        console,
        setTimeout,
        clearTimeout,
        setInterval: () => 1,
        clearInterval() {},
        URL,
    });
    vm.runInContext(outputFiles[0].text, context);
    const { MediaPlayerManager, setRockIt } = context.playerModule;
    const player = new MediaPlayerManager();
    const queue = {
        currentMedia: {
            type: "video",
            publicId: "video",
            duration_ms: 120000,
            videoUrl: "https://test/video",
            audioUrl: "https://test/audio",
        },
        currentQueueMediaId: 1,
        peekNextQueueItem: () => undefined,
    };
    setRockIt({
        queueManager: queue,
        webSocketManager: {
            isConnected: false,
            sendCurrentMedia() {},
            sendCurrentTime() {},
            sendSeek() {},
        },
        userManager: {
            queueTypeAtom: { get: () => undefined },
            repeatModeAtom: { get: () => "OFF" },
        },
        bookmarkManager: { currentMediaBookmarksAtom: { get: () => [] } },
    });
    return {
        player,
        queue,
        root,
        document,
        visibility(hidden) {
            document.hidden = hidden;
            for (const listener of listeners.get("visibilitychange") ?? [])
                listener();
        },
    };
}

async function start(player) {
    await player.setMedia();
    player.play();
    for (let i = 0; i < 12; i++) await Promise.resolve();
}

test("iOS plays video in foreground and switches to audio while screen is locked", async () => {
    const { player, visibility } = setup();
    await start(player);
    const audio = player.audioElement;
    const video = player.videoElement;
    assert.equal(audio.src, "https://test/audio");
    assert.equal(video.src, "https://test/video");
    assert.equal(video.muted, false);
    assert.equal(audio.paused, true);
    assert.equal(video.paused, false);
    audio.currentTime = 25;
    video.currentTime = 25;
    visibility(true);
    assert.equal(audio.paused, false);
    assert.equal(video.paused, true);
    assert.equal(player.playingAtom.get(), true);
    audio.currentTime = 52;
    visibility(false);
    assert.equal(video.currentTime, 52);
    assert.equal(video.paused, false);
    assert.equal(audio.paused, true);
    player.pause();
    player.setCurrentTime(60, false);
    assert.equal(video.currentTime, 60);
    visibility(true);
    visibility(false);
    assert.equal(audio.paused, true);
    assert.equal(video.paused, true);
});

test("picture errors and interruptions cannot skip or pause iOS audio", async () => {
    const { player, root } = setup();
    await start(player);
    player.videoElement.onerror(new Error("picture unavailable"));
    assert.equal(player.playingAtom.get(), true);
    const container = {
        appendChild(el) {
            el.parentElement = this;
        },
    };
    player.attachVideoToContainer(container);
    assert.equal(player.videoElement.parentElement, container);
    assert.equal(player.videoElement.style.display, "block");
    assert.equal(player.videoElement.style.position, "absolute");
    player.detachVideoFromContainer(container);
    assert.equal(player.videoElement.parentElement, root);
    player.pause();
    assert.equal(player.videoElement.paused, true);
    assert.equal(player.audioElement.paused, true);
    assert.equal(player.playingAtom.get(), false);
});

test("audio-only preference and switching to a song release the video source", async () => {
    const { player, queue } = setup();
    await start(player);
    await player.setAudioOnly(true);
    assert.equal(player.videoElement.src, "");
    await player.setAudioOnly(false);
    assert.equal(player.videoElement.src, "https://test/video");
    queue.currentMedia = {
        type: "song",
        publicId: "song",
        audioUrl: "https://test/song",
    };
    queue.currentQueueMediaId = 2;
    await start(player);
    assert.equal(player.audioElement.src, "https://test/song");
    assert.equal(player.videoElement.src, "");
});

test("other browsers retain the ordinary audible video engine", async () => {
    const { player } = setup("Chrome desktop");
    await start(player);
    assert.equal(player.audioElement.src, "");
    assert.equal(player.videoElement.src, "https://test/video");
    assert.equal(player.videoElement.muted, false);
    assert.equal(player.videoElement.paused, false);
});

test("radio plays native live audio, pauses, resumes, and switches stations", async () => {
    const { player, queue } = setup();
    queue.currentMedia = {
        type: "station",
        publicId: "a",
        streamUrl: "https://test/live-a",
    };
    await start(player);
    assert.equal(player.audioElement.src, "https://test/live-a");
    assert.equal(player.audioElement.paused, false);
    assert.equal(player.videoElement.paused, true);
    player.pause();
    assert.equal(player.audioElement.paused, true);
    player.play();
    for (let i = 0; i < 12; i++) await Promise.resolve();
    assert.equal(player.audioElement.paused, false);
    queue.currentMedia = {
        type: "station",
        publicId: "b",
        streamUrl: "https://test/live-b",
    };
    await start(player);
    assert.equal(player.audioElement.src, "https://test/live-b");
    assert.equal(player.audioElement.paused, false);
});
