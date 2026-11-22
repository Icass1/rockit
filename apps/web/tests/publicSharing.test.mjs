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
    let resolve;
    const result = new Promise((yes) => {
        resolve = yes;
    });
    const runtime = {
        init: async () => calls.push("init"),
        http: { getMediaAsync: () => result },
        queueManager: {
            init: async () => calls.push("queue-init"),
            setMedia: (items) => calls.push(["queue", items]),
            moveToMedia: (id) => calls.push(["select", id]),
        },
        mediaPlayerManager: { pause: () => calls.push("pause") },
        playerUIManager: { show: () => calls.push("open") },
        vocabularyManager: { vocabulary: { QUEUE_MEDIA_NOT_FOUND: "missing" } },
        notificationManager: { notifyError: (message) => calls.push(message) },
    };
    const context = vm.createContext({ runtime });
    vm.runInContext(outputFiles[0].text, context);
    return { ...context.sharing, calls, resolve };
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
