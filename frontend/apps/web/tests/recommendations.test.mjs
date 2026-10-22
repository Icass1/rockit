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
