/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    entryPoints: [
        new URL("../lib/managers/listenTogetherManager.ts", import.meta.url)
            .pathname,
    ],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "listening",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
        {
            name: "collaborators",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/(rockit\/rockIt|http)$/ },
                    ({ path }) => ({ path, namespace: "test" })
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "test" },
                    ({ path }) => ({
                        contents: path.endsWith("http")
                            ? "export const Http = globalThis.http;"
                            : "export const rockIt = globalThis.rockit;",
                    })
                );
            },
        },
    ],
});
const ok = (result = {}) => ({ isOk: () => true, result });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function atom(initial) {
    let value = initial;
    const listeners = [];
    return {
        get: () => value,
        listen: (cb) => listeners.push(cb),
        subscribe(cb) {
            listeners.push(cb);
            cb(value);
        },
        set(next) {
            const old = value;
            value = next;
            if (old !== next) for (const cb of listeners) cb(next, old);
        },
    };
}
function setup(username = "guest", status = "invited") {
    let sessions = [
        {
            publicId: "session",
            hostUsername: "host",
            guestUsername: "guest",
            status,
            currentMedia: {
                media: {
                    type: "song",
                    publicId: "host-track",
                    name: "Host track",
                },
            },
            currentTimeMs: 40000,
            updatedAt: new Date().toISOString(),
            isPlaying: true,
        },
    ];
    const sent = [],
        intervals = [];
    const savedQueue = {
        sorted: [
            {
                media: { publicId: "original" },
                queueMediaId: 8,
                listPublicId: "album",
            },
        ],
        random: [],
        currentQueueMediaId: 8,
        time: 12,
    };
    const player = {
        playingAtom: atom(false),
        currentTimeAtom: atom(0),
        currentTime: 0,
        isPlaybackOwner: true,
        pause() {
            this.playingAtom.set(false);
        },
        play() {
            this.playingAtom.set(true);
        },
        async setMedia() {},
        setCurrentTime(time) {
            this.currentTime = time;
            this.currentTimeAtom.set(time);
        },
    };
    const queue = {
        currentMedia: { publicId: "original" },
        currentMediaAtom: atom(null),
        captureListeningQueue: () => savedQueue,
        restoreListeningQueue(snapshot) {
            this.restored = snapshot;
            this.currentMedia = snapshot.sorted[0].media;
        },
        setMedia(items) {
            this.pending = items;
        },
        moveToMedia(id) {
            this.currentMedia = this.pending.find(
                (item) => item.publicId === id
            );
            this.currentMediaAtom.set(this.currentMedia);
        },
    };
    const loggedIn = atom(true);
    const rockit = {
        userManager: { usernameAtom: atom(username), loggedInAtom: loggedIn },
        webSocketManager: { onMessage() {} },
        queueManager: queue,
        mediaPlayerManager: player,
        vocabularyManager: {
            vocabulary: { FRIENDS_SESSION_ERROR: "session error" },
        },
        notificationManager: { notifyError() {} },
    };
    const http = {
        async getActiveSessions() {
            return ok({ sessions: sessions.map((s) => ({ ...s })) });
        },
        async joinSession() {
            sessions[0].status = "active";
            return ok();
        },
        async inviteToSession() {
            return ok();
        },
        async leaveSession() {
            sessions = [];
            return ok();
        },
        async syncSession(data) {
            sent.push(data);
            return ok();
        },
    };
    const context = {
        rockit,
        http,
        console,
        Date,
        setTimeout,
        clearTimeout,
        process: { env: {} },
        window: {
            setInterval: (fn) => intervals.push(fn),
            addEventListener() {},
        },
        document: { hidden: false, addEventListener() {} },
    };
    const { ListenTogetherManager } = vm.runInNewContext(
        `${outputFiles[0].text}; listening;`,
        context
    );
    const manager = new ListenTogetherManager();
    rockit.listenTogetherManager = manager;
    return {
        manager,
        player,
        queue,
        sent,
        intervals,
        savedQueue,
        loggedIn,
        end: () => {
            sessions = [];
        },
    };
}

test("invitations never take over playback before an explicit guest join", async () => {
    const s = setup();
    await s.manager.init();
    await tick();
    assert.equal(s.manager.activeSessionAtom.get(), null);
    assert.equal(s.queue.currentMedia.publicId, "original");
    assert.equal(await s.manager.join("session"), true);
    assert.equal(s.queue.currentMedia.publicId, "host-track");
    assert.ok(Math.abs(s.player.currentTime - 40) < 1);
    assert.equal(s.player.playingAtom.get(), true);
    assert.equal(s.sent.length, 0, "a guest never publishes host state");
});

test("leaving or remote termination restores the original queue and position, paused", async () => {
    for (const remote of [false, true]) {
        const s = setup();
        await s.manager.init();
        await tick();
        await s.manager.join("session");
        if (remote) {
            s.end();
            await s.manager.fetchSessions();
        } else await s.manager.leave("session");
        await tick();
        assert.equal(s.manager.activeSessionAtom.get(), null);
        assert.equal(s.queue.restored, s.savedQueue);
        assert.equal(s.player.currentTime, 12);
        assert.equal(s.player.playingAtom.get(), false);
    }
});

test("only the playback owner publishes; pause and seek synchronize immediately", async () => {
    const s = setup("host", "active");
    await s.manager.init();
    await tick();
    s.player.isPlaybackOwner = false;
    s.intervals[0]();
    await tick();
    assert.equal(s.sent.length, 0);
    s.player.isPlaybackOwner = true;
    s.player.play();
    await tick();
    assert.equal(s.sent.at(-1).isPlaying, true);
    s.player.pause();
    await tick();
    assert.equal(s.sent.at(-1).isPlaying, false);
    s.player.setCurrentTime(70);
    await tick();
    assert.equal(s.sent.at(-1).currentTimeMs, 70000);
});

test("sign-out discards the snapshot without restoring the previous account's queue", async () => {
    const s = setup();
    await s.manager.init();
    await tick();
    await s.manager.join("session");
    s.loggedIn.set(false);
    await tick();
    assert.equal(s.queue.restored, undefined);
    assert.equal(s.sent.length, 0);
});

test("periodic state refresh does not repeatedly restart a locally paused guest", async () => {
    const s = setup();
    await s.manager.init();
    await tick();
    await s.manager.join("session");
    s.player.pause();
    await s.manager.fetchSessions();
    assert.equal(s.player.playingAtom.get(), false);
});
