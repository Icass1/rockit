/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {EQueueAction} from './src/models/enums/queueAction'; export {BaseQueueManager} from './src/managers/baseQueueManager'; export {setRockIt} from './src/rockit/rockitRef'; export {buildRecommendationQueue, recommendationWindowSize} from './src/audio/recommendationQueue'; export {resolveNextOnEnd} from './src/audio/queueLogic';`,
        resolveDir: new URL("../../../packages/shared/", import.meta.url)
            .pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    tsconfig: new URL("../../../packages/shared/tsconfig.json", import.meta.url)
        .pathname,
});
const song = (id, downloaded = true) => ({
    type: "song",
    publicId: id,
    name: id,
    downloaded,
    artists: [{ name: "Artist" }],
    imageUrl: "",
    provider: "RockIt",
});
const result = (songs, discover = []) => ({
    songs,
    discover,
    discoverStatus: "disabled",
    discoverProvider: null,
});
const ok = (result) => ({ isOk: () => true, result });
const atom = (value) => ({
    get: () => value,
    set: (next) => {
        value = next;
    },
});
function setup({ repeat = "OFF", owner = true, playing = true } = {}) {
    const timers = [];
    const context = vm.createContext({
        console,
        URLSearchParams,
        setTimeout: (fn) => {
            timers.push(fn);
            return timers.length;
        },
        clearTimeout: () => {},
    });
    vm.runInContext(outputFiles[0].text, context);
    const { BaseQueueManager, setRockIt } = context.module;
    const manager = new BaseQueueManager();
    const calls = [];
    const http = {
        getRelatedSongs: async (...args) => {
            calls.push(["related", ...args]);
            return ok(result([song("next"), song("later")]));
        },
        prepareRecommendations: async (payload) => {
            calls.push(["prepare", payload]);
            return ok(result(payload.publicIds.map((id) => song(id))));
        },
    };
    const container = {
        queueManager: manager,
        http,
        userManager: {
            repeatModeAtom: atom(repeat),
            queueTypeAtom: atom("SORTED"),
        },
        mediaPlayerManager: {
            playingAtom: atom(playing),
            isPlaybackOwner: owner,
            setMedia: () => {},
            play: () => {},
        },
        webSocketManager: { sendCurrentQueue: () => {} },
    };
    setRockIt(container);
    function seed(ids = ["current"]) {
        const queue = ids.map((id, queueMediaId) => ({
            media: song(id),
            queueMediaId,
            listPublicId: "album",
        }));
        manager.sortedQueue = [...queue];
        manager.randomQueue = [...queue];
        manager._queueAtom.set(queue);
        manager._currentQueueMediaIdAtom.set(0);
        manager._currentMediaAtom.set(queue[0].media);
    }
    seed();
    return { manager, calls, http, container, seed, ...context.module };
}

test("repeat ONE and ALL preserve the original collection; OFF requests autoplay", () => {
    const { resolveNextOnEnd, EQueueAction } = setup();
    const queue = [{ queueMediaId: 0 }, { queueMediaId: 1 }];
    assert.equal(resolveNextOnEnd(queue, 1, "ONE").action, EQueueAction.REPLAY);
    assert.equal(resolveNextOnEnd(queue, 1, "ALL").nextId, 0);
    assert.equal(
        resolveNextOnEnd(queue, 1, "OFF").action,
        EQueueAction.AUTOPLAY
    );
});

test("lookahead includes songs remaining in the original queue", () => {
    const { recommendationWindowSize: size } = setup();
    assert.equal(size(3), 0);
    assert.equal(size(2), 0);
    assert.equal(size(1), 1);
    assert.equal(size(0), 2);
});

test("queue mixes local and external suggestions, excluding queued songs", () => {
    const { buildRecommendationQueue } = setup();
    const items = buildRecommendationQueue(
        result(
            [song("current"), song("a"), song("b"), song("c")],
            [{ name: "new", publicId: null }]
        ),
        new Set(["current"])
    );
    assert.equal(
        Array.from(items, (item) => item.kind).join(","),
        "song,song,discover,song"
    );
    assert.equal(items[0].song.publicId, "a");
});

test("reading suggestions does not prepare or download songs", async () => {
    const { manager, calls } = setup();
    await manager.loadAutoplaySuggestionsAsync();
    assert.equal(calls[0][3], false);
    assert.equal(calls.filter(([name]) => name === "prepare").length, 0);
});

test("slow external provider never delays local suggestions", async () => {
    const { manager, http } = setup();
    http.getRelatedSongs = async (_seed, _limit, external) =>
        external ? new Promise(() => {}) : ok(result([song("offline")]));
    await manager.loadAutoplaySuggestionsAsync();
    assert.equal(manager.autoplay[0].publicId, "offline");
});

test("paused playback, repeat, and secondary devices never prefetch", async () => {
    for (const state of [
        { playing: false },
        { repeat: "ALL" },
        { repeat: "ONE" },
        { owner: false },
    ]) {
        const { manager, calls } = setup(state);
        await manager.prepareAutoplayAsync();
        assert.equal(calls.length, 0);
    }
});

test("only one recommendation is prepared in the penultimate song", async () => {
    const { manager, seed, calls } = setup();
    seed(["current", "last"]);
    await manager.prepareAutoplayAsync();
    const prepare = calls.find(([name]) => name === "prepare");
    assert.equal(prepare[1].publicIds.length, 1);
});

test("autoplay skips pending downloads and appends one available fallback", async () => {
    const { manager } = setup();
    manager._autoplaySeedPublicId = "current";
    manager._autoplayQueueIdentity = manager.queueIdentity;
    manager._setRecommendations([
        { kind: "song", song: song("pending", false) },
        { kind: "song", song: song("ready") },
    ]);
    assert.equal(await manager.startAutoplayAsync(), true);
    assert.equal(manager.queue.length, 2);
    assert.equal(manager.currentMedia.publicId, "ready");
    assert.equal(manager.autoplay[0].publicId, "pending");
});

test("no playable fallback does not loop or change the current queue", async () => {
    const { manager } = setup();
    manager._autoplaySeedPublicId = "current";
    manager._autoplayQueueIdentity = manager.queueIdentity;
    manager._setRecommendations([
        { kind: "song", song: song("pending", false) },
    ]);
    assert.equal(await manager.startAutoplayAsync(), false);
    assert.equal(manager.queue.length, 1);
    assert.equal(manager.currentMedia.publicId, "current");
});

test("stale recommendation response cannot replace a newly selected queue", async () => {
    const { manager, http, seed } = setup();
    let resolve;
    http.getRelatedSongs = () =>
        new Promise((done) => {
            resolve = done;
        });
    const loading = manager.loadAutoplaySuggestionsAsync();
    seed(["different"]);
    manager._autoplaySeedPublicId = "different";
    resolve(ok(result([song("stale")])));
    await loading;
    assert.equal(manager.autoplay.length, 0);
});

test("pending autoplay cannot take over a replacement queue with reused ids and seed", async () => {
    const { manager, http, seed } = setup();
    let resolve;
    http.getRelatedSongs = () =>
        new Promise((done) => {
            resolve = done;
        });
    const pending = manager.startAutoplayAsync();
    seed(["new-user-choice", "current"]);
    resolve(ok(result([song("stale")])));
    assert.equal(await pending, false);
    assert.equal(manager.currentMedia.publicId, "new-user-choice");
    assert.equal(manager.queue.length, 2);
    assert.equal(manager.autoplay.length, 0);

    // The same seed in the replacement queue must still be able to load.
    http.getRelatedSongs = async () => ok(result([song("fresh")]));
    await manager.loadAutoplaySuggestionsAsync();
    assert.equal(manager.autoplay[0].publicId, "fresh");
});

test("late external suggestions cannot populate a replacement queue with the same seed", async () => {
    const { manager, http, seed } = setup();
    let resolveExternal;
    http.getRelatedSongs = async (_seed, _limit, external) =>
        external
            ? new Promise((done) => {
                  resolveExternal = done;
              })
            : ok(result([song("local")]));
    await manager.loadAutoplaySuggestionsAsync();
    seed(["new-user-choice", "current"]);
    resolveExternal(
        ok(result([], [{ name: "stale-discovery", publicId: null }]))
    );
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(
        manager.autoplayRecommendationsAtom
            .get()
            .some((item) => item.kind === "discover"),
        false
    );
});

test("preparation does not start for a queue replaced during recommendation loading", async () => {
    const { manager, http, seed, calls } = setup();
    let resolve;
    http.getRelatedSongs = () =>
        new Promise((done) => {
            resolve = done;
        });
    const pending = manager.prepareAutoplayAsync();
    seed(["new-user-choice", "current"]);
    resolve(ok(result([song("stale")])));
    await pending;
    assert.equal(calls.filter(([name]) => name === "prepare").length, 0);
});

const actionBundle = await build({
    entryPoints: [
        new URL(
            "../components/MediaContextMenu/actions/SimilarSongsAction.tsx",
            import.meta.url
        ).pathname,
    ],
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    bundle: true,
    write: false,
    format: "iife",
    globalName: "actionModule",
    jsx: "automatic",
    plugins: [
        {
            name: "action-dependencies",
            setup(b) {
                const stubs = {
                    "next/navigation":
                        "export const useRouter = () => globalThis.action.router;",
                    "@rockit/shared":
                        "export const isSearchResult = () => false;",
                    "lucide-react": "export const Radio = () => null;",
                    "@/lib/http": "export const Http = globalThis.action.http;",
                    "@/lib/rockit/rockIt":
                        "export const rockIt = globalThis.action;",
                    "@/components/ContextMenu/Option":
                        "export default () => null;",
                    "react/jsx-runtime":
                        "export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;",
                };
                b.onResolve({ filter: /.*/ }, ({ path }) =>
                    path in stubs
                        ? { path, namespace: "action-stub" }
                        : undefined
                );
                b.onLoad(
                    { filter: /.*/, namespace: "action-stub" },
                    ({ path }) => ({
                        contents: stubs[path],
                    })
                );
            },
        },
    ],
});

function playlistAction(add) {
    const events = [];
    const action = {
        http: {
            getRelatedSongs: async () =>
                ok(result([song("a"), song("b"), song("c")])),
            createPlaylistAsync: async () => ok({ publicId: "new-playlist" }),
            addMediaToPlaylistAsync: async (_id, { mediaPublicId }) => {
                events.push(["add", mediaPublicId]);
                return add(mediaPublicId);
            },
        },
        router: { push: (url) => events.push(["navigate", url]) },
        notificationManager: {
            notifyError: (message) => events.push(["error", message]),
            notifySuccess: (message) => events.push(["success", message]),
        },
    };
    const context = vm.createContext({ action });
    vm.runInContext(actionBundle.outputFiles[0].text, context);
    const option = context.actionModule.default({
        media: song("seed"),
        vocabulary: {
            ERROR_CREATING_PLAYLIST: "creation failed",
            SIMILAR_SONGS_PLAYLIST_CREATED: "created",
        },
        loading: false,
        setLoading: (value) => events.push(["loading", value]),
    });
    return { events, run: option.props.onClick };
}

test("similar-song playlists insert in order, awaiting each result before the next", async () => {
    let finish;
    const { events, run } = playlistAction((id) =>
        id === "a"
            ? new Promise((resolve) => {
                  finish = resolve;
              })
            : ok({})
    );
    const pending = run();
    while (!finish) await Promise.resolve();
    assert.deepEqual(
        events.filter(([name]) => name === "add"),
        [["add", "a"]]
    );
    finish(ok({}));
    await pending;
    assert.deepEqual(
        events.filter(([name]) => name === "add"),
        [
            ["add", "a"],
            ["add", "b"],
            ["add", "c"],
        ]
    );
    assert.deepEqual(events.slice(-3), [
        ["success", "created"],
        ["navigate", "/playlist/new-playlist"],
        ["loading", false],
    ]);
});

test("a failed playlist insertion stops the batch without announcing success", async () => {
    const { events, run } = playlistAction((id) =>
        id === "b" ? { isOk: () => false, message: "write failed" } : ok({})
    );
    await run();
    assert.deepEqual(
        events.filter(([name]) => name === "add"),
        [
            ["add", "a"],
            ["add", "b"],
        ]
    );
    assert.deepEqual(events.slice(-2), [
        ["error", "write failed"],
        ["loading", false],
    ]);
    assert.equal(
        events.some(([name]) => name === "success" || name === "navigate"),
        false
    );
});

test("a rejected playlist insertion reports failure and releases the loading state", async () => {
    const { events, run } = playlistAction(() =>
        Promise.reject(new Error("offline"))
    );
    await run();
    assert.deepEqual(events.slice(-2), [
        ["error", "creation failed"],
        ["loading", false],
    ]);
    assert.equal(
        events.some(([name]) => name === "success"),
        false
    );
});
