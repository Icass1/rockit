/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {BaseQueueManager} from '../../packages/shared/src/managers/baseQueueManager';
export {setRockIt} from '../../packages/shared/src/rockit/rockitRef';
export {createAtom} from '../../packages/shared/src/lib/store';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "fixture",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
});
const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
};
const ok = (result) => ({ isOk: () => true, isNotOk: () => false, result });
const fail = () => ({
    isOk: () => false,
    isNotOk: () => true,
    message: "failed",
});
function deferred() {
    let resolve;
    const promise = new Promise((yes) => {
        resolve = yes;
    });
    return { promise, resolve };
}
const song = (publicId) => ({
    type: "song",
    publicId,
    name: publicId,
    artists: [],
    downloaded: true,
});
function page({
    offset = 0,
    ids = [0, 1],
    total = ids.length,
    current = ids[0],
    prefix = "song",
} = {}) {
    return {
        offset,
        total,
        queueType: "SORTED",
        currentQueueMediaId: current,
        queue: ids.map((id) => ({
            queueMediaId: id,
            sortedIndex: id,
            randomIndex: id,
            listPublicId: "list",
            media: song(prefix + id),
        })),
    };
}
function setup({ seed = page(), playing = false } = {}) {
    const timers = new Map(),
        handlers = new Map(),
        requests = [],
        errors = [];
    let serial = 0;
    const context = vm.createContext({
        process: { env: {} },
        setTimeout(fn, delay) {
            const id = ++serial;
            timers.set(id, { fn, delay });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    const { BaseQueueManager, setRockIt, createAtom } = context.fixture;
    const queue = new BaseQueueManager();
    const calls = { loads: 0, plays: 0, pauses: 0, playback: 0 };
    const socket = {
        onMessage(type, fn) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type).add(fn);
        },
        offMessage(type, fn) {
            handlers.get(type)?.delete(fn);
        },
        requestPlaybackState() {
            calls.playback++;
        },
        sendCurrentQueue() {},
        sendSkipClicked() {},
        sendMediaClicked() {},
    };
    const runtime = {
        queueManager: queue,
        webSocketManager: socket,
        userManager: {
            repeatModeAtom: createAtom("OFF"),
            queueTypeAtom: createAtom("SORTED"),
            queueType: "SORTED",
        },
        mediaPlayerManager: {
            playingAtom: createAtom(playing),
            isPlaybackOwner: true,
            currentTime: 0,
            async setMedia() {
                calls.loads++;
            },
            play() {
                calls.plays++;
            },
            pause() {
                calls.pauses++;
            },
        },
        bookmarkManager: {
            skipToNextBookmark: () => false,
            skipToPrevBookmark: () => false,
        },
        notificationManager: { notifyError: (message) => errors.push(message) },
        vocabularyManager: {
            vocabulary: { ERROR_GETTING_QUEUE: "queue failure" },
        },
        http: new Proxy(
            {},
            {
                get:
                    (_, name) =>
                    (...args) => {
                        const pending = deferred();
                        requests.push({ name, args, ...pending });
                        return pending.promise;
                    },
            }
        ),
    };
    setRockIt(runtime);
    if (seed) queue.seedQueue(seed);
    const take = (name) => {
        const index = requests.findIndex((r) => r.name === name);
        assert.ok(index >= 0, `Missing request ${name}`);
        return requests.splice(index, 1)[0];
    };
    return { queue, runtime, calls, timers, handlers, requests, errors, take };
}

test("native-compatible initialization is idempotent, balanced and preserves the seeded queue on restart", async () => {
    const e = setup();
    const first = e.queue.init();
    assert.equal(e.queue.init(), first);
    await first;
    assert.equal(e.requests.length, 0);
    assert.equal(e.calls.loads, 1);
    assert.equal(e.queue.sortedQueueAtom.length, 2);
    for (const name of ["current_queue", "current_media"])
        assert.equal(e.handlers.get(name).size, 1);
    assert.equal(e.queue.currentMediaAtom.lc, 1);
    assert.equal(e.runtime.mediaPlayerManager.playingAtom.lc, 1);
    assert.equal(e.runtime.userManager.repeatModeAtom.lc, 1);
    const identity = e.queue.queueIdentity;
    const oldMedia = [...e.handlers.get("current_media")][0];
    e.queue.stop();
    e.queue.stop();
    for (const name of ["current_queue", "current_media"])
        assert.equal(e.handlers.get(name).size, 0);
    assert.equal(e.queue.currentMediaAtom.lc, 0);
    assert.equal(e.runtime.mediaPlayerManager.playingAtom.lc, 0);
    assert.equal(e.runtime.userManager.repeatModeAtom.lc, 0);
    await e.queue.init();
    oldMedia({ queueMediaId: 1, mediaPublicId: "song1" });
    assert.equal(e.queue.currentQueueMediaId, 0);
    assert.equal(e.queue.queueIdentity, identity);
    assert.equal(e.calls.loads, 1);
    assert.equal(e.calls.plays + e.calls.pauses, 0);
    e.queue.stop();
});

test("stopped initialization cannot apply a late response or reattach integrations after a restart", async () => {
    for (const result of [ok(page({ prefix: "old" })), fail()]) {
        const e = setup({ seed: null });
        const first = e.queue.init(),
            old = e.take("getQueue");
        e.queue.stop();
        const second = e.queue.init(),
            fresh = e.take("getQueue");
        fresh.resolve(ok(page({ prefix: "new" })));
        await second;
        old.resolve(result);
        await first;
        assert.equal(e.queue.currentMedia.publicId, "new0");
        assert.equal(e.calls.loads, 1);
        assert.equal(e.calls.playback, 1);
        assert.equal(e.handlers.get("current_queue").size, 1);
        assert.equal(e.errors.length, 0);
        e.queue.stop();
    }
});

test("latest refresh wins and a pending refresh cannot replace a user-selected queue", async () => {
    const e = setup();
    await e.queue.init();
    const first = e.queue.refreshAsync(),
        old = e.take("getQueue");
    const second = e.queue.refreshAsync(),
        fresh = e.take("getQueue");
    fresh.resolve(ok(page({ prefix: "new" })));
    await second;
    old.resolve(ok(page({ prefix: "old" })));
    await first;
    assert.equal(e.queue.currentMedia.publicId, "new0");
    const pending = e.queue.refreshAsync(),
        read = e.take("getQueue");
    e.queue.setMedia([song("chosen")], "chosen-list");
    read.resolve(ok(page({ prefix: "late" })));
    await pending;
    assert.equal(e.queue.queue[0].media.publicId, "chosen");
    assert.equal(e.calls.playback, 2);
    e.queue.stop();
});

test("page requests deduplicate and stale cleanup cannot remove the replacement load at the same offset", async () => {
    for (const oldResult of [
        ok(page({ offset: 2, ids: [2, 3], total: 4 })),
        fail(),
    ]) {
        const e = setup({ seed: page({ total: 4 }) });
        await e.queue.init();
        const first = e.queue.loadNextQueuePageAsync(),
            old = e.take("getQueue");
        const duplicate = e.queue.loadNextQueuePageAsync();
        assert.equal(e.requests.length, 0);
        e.queue.stop();
        await e.queue.init();
        const second = e.queue.loadNextQueuePageAsync(),
            fresh = e.take("getQueue");
        old.resolve(oldResult);
        assert.equal(await first, false);
        assert.equal(await duplicate, false);
        const another = e.queue.loadNextQueuePageAsync();
        assert.equal(e.requests.length, 0);
        fresh.resolve(ok(page({ offset: 2, ids: [2, 3], total: 4 })));
        assert.equal(await second, true);
        assert.equal(await another, true);
        assert.equal(e.queue.queue.length, 4);
        assert.equal(e.errors.length, 0);
        e.queue.stop();
    }
});

test("paged next/previous preserve progression and reject a changed selection or stopped lifecycle", async () => {
    for (const backwards of [false, true]) {
        for (const interrupt of ["none", "selection", "stop"]) {
            const e = setup({
                seed: page({
                    offset: backwards ? 2 : 0,
                    ids: backwards ? [2, 3] : [0, 1],
                    total: 4,
                    current: backwards ? 2 : 1,
                }),
            });
            await e.queue.init();
            if (backwards) e.queue.skipBack();
            else e.queue.skipForward();
            const read = e.take("getQueue");
            if (interrupt === "selection")
                e.queue.setQueueMediaId(backwards ? 3 : 0);
            if (interrupt === "stop") e.queue.stop();
            read.resolve(
                ok(
                    page({
                        offset: backwards ? 0 : 2,
                        ids: backwards ? [0, 1] : [2, 3],
                        total: 4,
                    })
                )
            );
            await flush();
            assert.equal(e.calls.plays, interrupt === "none" ? 1 : 0);
            if (interrupt === "none")
                assert.equal(e.queue.currentQueueMediaId, backwards ? 1 : 2);
            e.queue.stop();
        }
    }
});

test("stop cancels autoplay timers and already-queued callbacks cannot prepare after restart", async () => {
    const e = setup({ playing: true });
    await e.queue.init();
    const oldTimer = [...e.timers.values()].find((t) => t.delay === 700);
    assert.ok(oldTimer);
    e.queue.stop();
    assert.equal(e.timers.size, 0);
    await e.queue.init();
    oldTimer.fn();
    assert.equal(e.requests.length, 0);
    assert.equal(e.timers.size, 1);
    e.queue.stop();
});

test("late local/external recommendation responses do not alter a restarted queue", async () => {
    for (const external of [false, true]) {
        const e = setup();
        await e.queue.init();
        const first = e.queue.loadAutoplaySuggestionsAsync(),
            old = e.take("getRelatedSongs");
        let externalRead;
        if (external) {
            old.resolve(ok({ songs: [song("old-local")], discover: [] }));
            await first;
            externalRead = e.take("getRelatedSongs");
        }
        e.queue.stop();
        await e.queue.init();
        const second = e.queue.loadAutoplaySuggestionsAsync(),
            fresh = e.take("getRelatedSongs");
        (externalRead ?? old).resolve(
            ok({ songs: [song("stale")], discover: [] })
        );
        await first;
        await flush();
        assert.equal(e.queue.autoplay.length, 0);
        assert.equal(e.queue.autoplayLoadingAtom.get(), true);
        fresh.resolve(ok({ songs: [song("fresh")], discover: [] }));
        await second;
        assert.equal(e.queue.autoplay[0].publicId, "fresh");
        e.queue.stop();
    }
});

test("old preparation finally cannot unlock a new preparation or resurrect retry timers", async () => {
    const e = setup({ playing: true });
    await e.queue.init();
    const first = e.queue.prepareAutoplayAsync();
    e.take("getRelatedSongs").resolve(
        ok({ songs: [song("old")], discover: [] })
    );
    await flush();
    const old = e.take("prepareRecommendations");
    e.take("getRelatedSongs").resolve(fail());
    e.queue.stop();
    await e.queue.init();
    const second = e.queue.prepareAutoplayAsync();
    e.take("getRelatedSongs").resolve(
        ok({ songs: [song("fresh")], discover: [] })
    );
    await flush();
    const fresh = e.take("prepareRecommendations");
    old.resolve(ok({ songs: [], discover: [] }));
    await first;
    await e.queue.prepareAutoplayAsync();
    assert.equal(
        e.requests.filter((r) => r.name === "prepareRecommendations").length,
        0
    );
    assert.equal(
        [...e.timers.values()].filter((t) => t.delay === 15000).length,
        0
    );
    fresh.resolve(ok({ songs: [], discover: [] }));
    await second;
    assert.equal(
        [...e.timers.values()].filter((t) => t.delay === 15000).length,
        1
    );
    e.queue.stop();
    assert.equal(e.timers.size, 0);
});

test("account reset clears queue/current media/recommendations and reloads the new account", async () => {
    const e = setup();
    await e.queue.init();
    const load = e.queue.loadAutoplaySuggestionsAsync();
    e.take("getRelatedSongs").resolve(
        ok({ songs: [song("private")], discover: [] })
    );
    await load;
    e.queue.reset();
    assert.equal(e.queue.queue.length, 0);
    assert.equal(e.queue.sortedQueueAtom.length, 0);
    assert.equal(e.queue.currentMedia, undefined);
    assert.equal(e.queue.currentList, undefined);
    assert.equal(e.queue.currentQueueMediaId, null);
    assert.equal(e.queue.queueTotalCount, 0);
    assert.equal(e.queue.autoplay.length, 0);
    const restart = e.queue.init();
    e.take("getQueue").resolve(ok(page({ prefix: "new-account" })));
    await restart;
    assert.equal(e.queue.currentMedia.publicId, "new-account0");
    e.queue.stop();
});

test("wrapping across unloaded pages keeps queue boundaries and stops after a selection change", async () => {
    for (const backwards of [false, true]) {
        for (const interrupted of [false, true]) {
            const e = setup({
                seed: page({
                    offset: backwards ? 0 : 2,
                    ids: backwards ? [0, 1] : [2, 3],
                    total: 4,
                    current: backwards ? 0 : 3,
                }),
            });
            await e.queue.init();
            if (backwards) e.queue.skipBack();
            else e.queue.skipForward();
            const read = e.take("getQueue");
            if (interrupted) e.queue.setQueueMediaId(backwards ? 1 : 2);
            read.resolve(
                ok(
                    page({
                        offset: backwards ? 2 : 0,
                        ids: backwards ? [2, 3] : [0, 1],
                        total: 4,
                    })
                )
            );
            await flush();
            assert.equal(e.calls.plays, interrupted ? 0 : 1);
            if (!interrupted)
                assert.equal(e.queue.currentQueueMediaId, backwards ? 3 : 0);
            e.queue.stop();
        }
    }
});

test("cleanup detaches handlers from the socket used for setup", async () => {
    const e = setup();
    await e.queue.init();
    e.runtime.webSocketManager = {
        offMessage() {
            throw new Error("Wrong socket");
        },
    };
    e.queue.stop();
    assert.equal(e.handlers.get("current_queue").size, 0);
    assert.equal(e.handlers.get("current_media").size, 0);
});
