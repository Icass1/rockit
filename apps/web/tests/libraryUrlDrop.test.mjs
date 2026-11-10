import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const web = fileURLToPath(new URL("..", import.meta.url));
const state = {
    calls: [],
    events: [],
    errors: [],
    success: [],
    fail: false,
    throws: false,
};
globalThis.__libraryUrlDrop = {
    Http: {
        async addFromUrlAsync(body) {
            state.calls.push(body);
            if (state.throws) throw Error("Offline");
            return {
                isOk: () => !state.fail,
                message: "Import failed",
                result: { data: { publicId: "imported", name: "Track" } },
            };
        },
    },
    rockIt: {
        eventManager: { dispatchEvent: (...args) => state.events.push(args) },
        vocabularyManager: {
            vocabulary: {
                ADDING_MEDIA_TO_LIBRARY: "Adding",
                ADDED_TO_LIBRARY: "added",
                LIBRARY_DROP_ERROR: "Drop failed",
            },
        },
        notificationManager: {
            notifyInfo() {},
            notifyError: (value) => state.errors.push(value),
            notifySuccess: (value) => state.success.push(value),
        },
    },
};
const bundle = await build({
    stdin: {
        contents: `export { LibraryManager } from "./lib/managers/libraryManager"; export { droppedUrl, isLinkDrag } from "./lib/utils/droppedUrl";`,
        resolveDir: web,
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [
        {
            name: "fixtures",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/(lib\/http|lib\/rockit\/rockIt)$/ },
                    (args) => ({ path: args.path, namespace: "fixtures" })
                );
                builder.onLoad({ filter: /.*/, namespace: "fixtures" }, () => ({
                    contents:
                        "export const { Http, rockIt } = globalThis.__libraryUrlDrop;",
                    loader: "js",
                }));
            },
        },
    ],
});
const { LibraryManager, droppedUrl, isLinkDrag } = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

test("URI lists ignore comments; plain text accepts only HTTP(S) links", () => {
    assert.equal(
        droppedUrl(
            "# Browser link\r\nhttps://example.com/track\r\nhttps://example.com/other",
            ""
        ),
        "https://example.com/track"
    );
    assert.equal(
        droppedUrl("", " https://example.com/playlist "),
        "https://example.com/playlist"
    );
    for (const text of [
        "Not a URL",
        "javascript:alert(1)",
        "file:///tmp/song",
        "https://example.com/ two",
    ])
        assert.equal(droppedUrl("", text), null);
    assert.equal(isLinkDrag(["Files", "text/uri-list"]), false);
    assert.equal(isLinkDrag(["text/uri-list"]), true);
    assert.equal(isLinkDrag(["application/json"]), false);
});

test("library URL imports add to library and refresh its media", async () => {
    const manager = new LibraryManager();
    await manager.addUrlToLibraryAsync("https://example.com/track");
    assert.deepEqual(state.calls[0], {
        url: "https://example.com/track",
        addToPlaylist: false,
        addToLibrary: true,
        playlistPublicId: null,
    });
    assert.equal(state.events.length, 1);
    assert.deepEqual(state.events[0][1], { publicId: "imported" });
    assert.equal(state.success.length, 1);
    state.fail = true;
    await manager.addUrlToLibraryAsync("https://example.com/fail");
    state.throws = true;
    await manager.addUrlToLibraryAsync("https://example.com/offline");
    assert.deepEqual(state.errors, ["Import failed", "Drop failed"]);
    assert.equal(state.events.length, 1);
});
