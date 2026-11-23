import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: "export * from './lib/services/publicSharing';",
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "sharing",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "runtime",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/rockit\/rockIt$/ },
                    () => ({ path: "runtime", namespace: "test" })
                );
                builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
                    contents: "export const rockIt = globalThis.runtime;",
                }));
            },
        },
    ],
});
function fixture() {
    const calls = [];
    const copies = [];
    const logs = [];
    let resolve;
    const result = new Promise((yes) => {
        resolve = yes;
    });
    const runtime = {
        init: async () => calls.push("init"),
        http: { getMediaAsync: () => result },
        queueManager: {
            init: async () => calls.push("queue-init"),
            setMedia: (items) => {
                calls.push(["queue", items]);
                runtime.queueManager.currentMedia = items[0];
                runtime.queueManager.queueIdentity = {};
                runtime.queueManager.currentQueueMediaId = 0;
            },
            moveToMedia: (id) => calls.push(["select", id]),
        },
        mediaPlayerManager: {
            pause: () => calls.push("pause"),
            setMedia: async () => calls.push("load"),
            setCurrentTime: (time) => calls.push(["seek", time]),
            currentTimeAtom: { get: () => 12.75 },
            durationAtom: { get: () => 0 },
        },
        playerUIManager: { show: () => calls.push("open") },
        vocabularyManager: {
            vocabulary: {
                QUEUE_MEDIA_NOT_FOUND: "missing",
                SHARING_LINK_COPIED: "copied",
                SHARING_LINK_ERROR: "copy failed",
            },
        },
        notificationManager: {
            notifyError: (message) => calls.push(message),
            notifySuccess: (message) => calls.push(message),
        },
    };
    const context = vm.createContext({
        runtime,
        URL,
        window: { location: { origin: "https://rockit.example" } },
        navigator: {
            clipboard: { writeText: async (url) => copies.push(url) },
        },
        console: { log: (url) => logs.push(url) },
    });
    vm.runInContext(outputFiles[0].text, context);
    return {
        ...context.sharing,
        calls,
        resolve,
        runtime,
        context,
        copies,
        logs,
    };
}
test("song and video links use a queue query; collections retain their own routes", () => {
    const f = fixture();
    for (const type of ["song", "video"])
        assert.equal(
            f.publicMediaPath({ type, publicId: "a&b" }),
            "/?media=a%26b"
        );
    for (const type of ["album", "playlist"])
        assert.equal(
            f.publicMediaPath({ type, publicId: "id" }),
            `/${type}/id`
        );
});

test("timestamp links use whole seconds only for recorded media", () => {
    const f = fixture();
    for (const type of ["song", "video"]) {
        assert.equal(
            f.publicMediaPath({ type, publicId: "a&b" }, 12.75),
            "/?media=a%26b&t=12"
        );
        assert.equal(
            f.publicMediaPath({ type, publicId: "id" }, 0),
            "/?media=id&t=0"
        );
        for (const time of [-1, NaN, Infinity])
            assert.equal(
                f.publicMediaPath({ type, publicId: "id" }, time),
                "/?media=id"
            );
    }
    for (const type of ["album", "playlist", "artist", "station"])
        assert.equal(
            f.publicMediaPath({ type, publicId: "id" }, 12),
            f.publicMediaPath({ type, publicId: "id" })
        );
});

test("timestamp parsing ignores malformed, negative and nonfinite values", () => {
    const f = fixture();
    for (const value of [
        null,
        "",
        " ",
        "-1",
        "NaN",
        "Infinity",
        "1:02",
        "0x10",
        "1e3",
        "12seconds",
        "9".repeat(400),
    ])
        assert.equal(f.parsePublicMediaTimestamp(value), undefined);
    assert.equal(f.parsePublicMediaTimestamp("0"), 0);
    assert.equal(f.parsePublicMediaTimestamp("125.5"), 125.5);
});

test("the footer action reads the current playback time when copying", async () => {
    const f = fixture();
    const media = { type: "video", publicId: "a&b" };
    f.runtime.queueManager.currentMedia = media;
    await f.copyPublicMediaLink(media);
    await f.copyPublicMediaLinkAtCurrentTime(media);
    f.runtime.mediaPlayerManager.currentTimeAtom.get = () => 25.9;
    await f.copyPublicMediaLinkAtCurrentTime(media);
    assert.deepEqual(f.copies, [
        "https://rockit.example/?media=a%26b",
        "https://rockit.example/?media=a%26b&t=12",
        "https://rockit.example/?media=a%26b&t=25",
    ]);
    assert.deepEqual(f.logs, []);
});

test("a stale footer action cannot copy a different recording's timestamp", async () => {
    const f = fixture();
    f.runtime.queueManager.currentMedia = { type: "song", publicId: "current" };
    await f.copyPublicMediaLinkAtCurrentTime({ type: "song", publicId: "old" });
    await f.copyPublicMediaLinkAtCurrentTime({
        type: "station",
        publicId: "current",
    });
    assert.deepEqual(f.copies, []);
});

test("failed timestamp copies log the full share link", async () => {
    for (const clipboard of [
        undefined,
        {
            writeText: async () => {
                throw new Error("denied");
            },
        },
    ]) {
        const f = fixture();
        f.context.navigator.clipboard = clipboard;
        await f.copyPublicMediaLink({ type: "song", publicId: "shared" }, 12);
        assert.deepEqual(f.logs, ["https://rockit.example/?media=shared&t=12"]);
        assert.ok(f.calls.includes("copy failed"));
    }
});

test("a shared timestamp waits for source loading and clamps to the recording duration", async () => {
    for (const [time, expected] of [
        [12.5, 12.5],
        [0, 0],
        [999, 30],
    ]) {
        const f = fixture();
        let finishLoad;
        f.runtime.mediaPlayerManager.setMedia = () =>
            new Promise((resolve) => {
                finishLoad = resolve;
            });
        const opening = f.openPublicMediaLink("shared", () => true, time);
        f.resolve({
            isOk: () => true,
            result: {
                media: {
                    type: "song",
                    publicId: "shared",
                    downloaded: true,
                    duration_ms: 30000,
                },
            },
        });
        while (!finishLoad) await Promise.resolve();
        assert.ok(
            !f.calls.some((call) => Array.isArray(call) && call[0] === "seek")
        );
        finishLoad();
        await opening;
        assert.deepEqual(f.calls.at(-1), ["seek", expected]);
    }
});

test("an obsolete timestamp cannot seek after navigation or queue replacement", async () => {
    for (const change of ["unmount", "media", "queue", "queue item"]) {
        const f = fixture();
        let active = true;
        let finishLoad;
        f.runtime.mediaPlayerManager.setMedia = () =>
            new Promise((resolve) => {
                finishLoad = resolve;
            });
        const opening = f.openPublicMediaLink("shared", () => active, 12);
        f.resolve({
            isOk: () => true,
            result: {
                media: { type: "video", publicId: "shared", downloaded: true },
            },
        });
        while (!finishLoad) await Promise.resolve();
        if (change === "unmount") active = false;
        if (change === "media")
            f.runtime.queueManager.currentMedia = { publicId: "another" };
        if (change === "queue") f.runtime.queueManager.queueIdentity = {};
        if (change === "queue item")
            f.runtime.queueManager.currentQueueMediaId = 1;
        finishLoad();
        await opening;
        assert.ok(
            !f.calls.some((call) => Array.isArray(call) && call[0] === "seek")
        );
    }
});

test("invalid timestamps and live streams do not trigger seeking", async () => {
    for (const [type, time] of [
        ["song", -1],
        ["song", NaN],
        ["song", Infinity],
        ["station", 12],
    ]) {
        const f = fixture();
        const opening = f.openPublicMediaLink("shared", () => true, time);
        f.resolve({
            isOk: () => true,
            result: { media: { type, publicId: "shared", downloaded: true } },
        });
        await opening;
        assert.ok(!f.calls.includes("load"));
    }
});
test("a shared recording replaces the queue and opens the player after startup", async () => {
    const f = fixture();
    const opening = f.openPublicMediaLink("shared", () => true);
    const media = { publicId: "shared", type: "video", downloaded: true };
    f.resolve({ isOk: () => true, result: { media } });
    await opening;
    assert.deepEqual(JSON.parse(JSON.stringify(f.calls)), [
        "init",
        "queue-init",
        "pause",
        ["queue", [media]],
        ["select", "shared"],
        "open",
    ]);
});
test("a replaced or unmounted link cannot overwrite the current queue", async () => {
    const f = fixture();
    let active = true;
    const opening = f.openPublicMediaLink("old", () => active);
    await Promise.resolve();
    await Promise.resolve();
    active = false;
    f.resolve({
        isOk: () => true,
        result: { media: { publicId: "old", type: "song" } },
    });
    await opening;
    assert.ok(!f.calls.includes("pause") && !f.calls.includes("open"));
});
test("missing and unqueueable links leave the current queue intact", async () => {
    for (const response of [
        { isOk: () => false },
        { isOk: () => true, result: { media: { type: "album" } } },
    ]) {
        const f = fixture();
        const opening = f.openPublicMediaLink("invalid", () => true);
        f.resolve(response);
        await opening;
        assert.ok(f.calls.includes("missing"));
        assert.ok(!f.calls.includes("pause") && !f.calls.includes("open"));
    }
});
