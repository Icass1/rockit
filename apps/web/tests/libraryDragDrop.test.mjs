import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const web = fileURLToPath(new URL("..", import.meta.url));
const state = {
    owned: [],
    calls: [],
    refs: [],
    errors: [],
    success: [],
    status: {},
    failOwner: false,
    failWrite: false,
    wait: null,
};
const response = (ok, result = {}) => ({
    result,
    isOk: () => ok,
    isNotOk: () => !ok,
});
globalThis.__libraryDndTest = {
    Http: {
        async getUserPlaylistsAsync() {
            state.calls.push("owner");
            if (state.wait) await state.wait;
            if (state.failOwner) throw Error("Offline");
            return response(true, { playlists: state.owned });
        },
        async addMediaToPlaylistAsync(id, body) {
            state.calls.push({ id, body });
            return response(!state.failWrite);
        },
    },
    rockIt: {
        vocabularyManager: {
            vocabulary: {
                LIBRARY_DROP_ERROR: "error",
                LIBRARY_DROP_OWNER_ONLY: "owner only",
                LIBRARY_DROP_SUCCESS: "{media} to {playlist}",
            },
        },
        notificationManager: {
            notifyError: (message) => state.errors.push(message),
            notifySuccess: (message) => state.success.push(message),
        },
    },
    state,
};
const fixtures = {
    "@/lib/http": "export const Http = globalThis.__libraryDndTest.Http;",
    "@/lib/rockit/rockIt":
        "export const rockIt = globalThis.__libraryDndTest.rockIt;",
    "@/lib/offline/store": `const state=globalThis.__libraryDndTest.state;
        export const offlineStatusMap={get:()=>state.status};
        export async function addSongPlaylistRef(id,playlist){state.refs.push({id,playlist});}
        export async function removeSongPlaylistRef(){}`,
    "@/lib/store": `export function createArrayAtom(initial){let value=initial;return{get:()=>value,set:v=>{value=v;},getReadonlyAtom(){return this;}};}`,
    "@rockit/shared":
        "export const EEvent={};export const EWebSocketMessage={};export const isSong=m=>m.type==='song';",
};
async function load(entry) {
    const result = await build({
        absWorkingDir: web,
        entryPoints: [entry],
        bundle: true,
        platform: "node",
        format: "esm",
        write: false,
        plugins: [
            {
                name: "fixtures",
                setup(builder) {
                    builder.onResolve({ filter: /^@/ }, (args) =>
                        fixtures[args.path]
                            ? { path: args.path, namespace: "fixtures" }
                            : undefined
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "fixtures" },
                        (args) => ({
                            contents: fixtures[args.path],
                            loader: "js",
                        })
                    );
                },
            },
        ],
    });
    return import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
    );
}
const { PlaylistManager } = await load("lib/managers/playlistManager.ts");
const { isLibraryDragSource, dragThresholdReached, dragScrollSpeed } =
    await load("lib/utils/libraryDragDrop.ts");
const media = { type: "song", publicId: "song-1", name: "Song" };
const own = { publicId: "own", name: "My playlist" };
function reset() {
    Object.assign(state, {
        owned: [own],
        calls: [],
        refs: [],
        errors: [],
        success: [],
        status: { "song-1": "downloaded" },
        failOwner: false,
        failWrite: false,
        wait: null,
    });
}

test("only library songs and albums are drag sources", () => {
    assert.equal(isLibraryDragSource(media), true);
    assert.equal(isLibraryDragSource({ ...media, type: "album" }), true);
    for (const type of ["playlist", "station", "video", "artist"])
        assert.equal(isLibraryDragSource({ ...media, type }), false);
    assert.equal(isLibraryDragSource({ ...media, publicId: null }), false);
    assert.equal(isLibraryDragSource({ ...media, publicId: "" }), false);
});

test("small movement preserves clicks and scrolling stops outside the visible container", () => {
    assert.equal(dragThresholdReached(0, 0, 3, 4), false);
    assert.equal(dragThresholdReached(0, 0, 8, 0), true);
    assert.equal(dragScrollSpeed(-1, 0, 600), 0);
    assert.equal(dragScrollSpeed(601, 0, 600), 0);
    assert.equal(dragScrollSpeed(300, 0, 600), 0);
    assert(dragScrollSpeed(10, 0, 600) < 0);
    assert(dragScrollSpeed(590, 0, 600) > 0);
});

test("a cached or display-name match cannot authorize a drop", async () => {
    reset();
    const manager = new PlaylistManager();
    await manager.refreshPlaylistsAsync();
    state.calls = [];
    state.owned = [];
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        false
    );
    assert.deepEqual(state.calls, ["owner"]);
    assert.deepEqual(state.refs, []);
    assert.deepEqual(state.success, []);
});

test("album uses one media write and success is confirmed only afterwards", async () => {
    reset();
    const manager = new PlaylistManager();
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(
            { ...media, type: "album", publicId: "album-1" },
            "own"
        ),
        true
    );
    assert.deepEqual(state.calls, [
        "owner",
        { id: "own", body: { mediaPublicId: "album-1" } },
    ]);
    assert.equal(state.success.length, 1);
    assert.equal(state.refs.length, 0);
});

test("failed server write never updates offline membership or claims success", async () => {
    reset();
    state.failWrite = true;
    const manager = new PlaylistManager();
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        false
    );
    assert.equal(state.refs.length, 0);
    assert.equal(state.success.length, 0);
    assert.equal(state.errors.length, 1);
    state.failWrite = false;
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        true
    );
    assert.equal(state.refs.length, 1);
});

test("offline owner lookup cannot authorize a write and releases the pending lock", async () => {
    reset();
    state.failOwner = true;
    const manager = new PlaylistManager();
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        false
    );
    assert.deepEqual(state.calls, ["owner"]);
    state.failOwner = false;
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        true
    );
});

test("repeated drops while a target is saving issue only one write", async () => {
    reset();
    let release;
    state.wait = new Promise((resolve) => {
        release = resolve;
    });
    const manager = new PlaylistManager();
    const first = manager.addLibraryMediaToOwnedPlaylist(media, "own");
    assert.equal(
        await manager.addLibraryMediaToOwnedPlaylist(media, "own"),
        false
    );
    release();
    assert.equal(await first, true);
    assert.equal(
        state.calls.filter((call) => typeof call === "object").length,
        1
    );
});
