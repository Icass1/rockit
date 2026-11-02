import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {getFixedVirtualRange} from './lib/utils/fixedVirtualRange';
                   export {startVinylRotation} from './lib/utils/vinylRotation';
                   export {buildRecommendationQueue} from '../../packages/shared/src/audio/recommendationQueue';
                   export {RecommendationArtworkManager} from './lib/managers/recommendationArtworkManager';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "helpers",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "artwork-http-boundary",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/rockit\/rockIt$/ },
                    () => ({ path: "rockit", namespace: "fixture" })
                );
                builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                    contents:
                        "export const rockIt = new Proxy({}, {get: (_, key) => globalThis.artworkFixture[key]});",
                    loader: "js",
                }));
            },
        },
    ],
});
const context = vm.createContext({
    requestAnimationFrame() {
        throw new Error("opener animation clock must not be used");
    },
    cancelAnimationFrame() {
        throw new Error("opener cancellation must not be used");
    },
});
vm.runInContext(outputFiles[0].text, context);
const { getFixedVirtualRange, startVinylRotation } = context.helpers;

for (const height of [64, 66]) {
    test(`virtual queue geometry stays bounded beyond the recommendation footer (${height}px rows)`, () => {
        for (const count of [0, 1, 10, 5000]) {
            for (const scroll of [
                0,
                0.5,
                100,
                count * height,
                count * height + 2000,
                1000000,
            ]) {
                const r = getFixedVirtualRange(count, height, 600, scroll);
                assert.ok(0 <= r.startIndex && r.startIndex <= r.endIndex);
                assert.ok(r.endIndex <= count);
                assert.ok(r.topPadding >= 0 && r.bottomPadding >= 0);
                assert.equal(
                    r.topPadding +
                        (r.endIndex - r.startIndex) * height +
                        r.bottomPadding,
                    count * height
                );
            }
        }
    });
}

test("scrolling repeatedly below the queue cannot manufacture additional rows or space", () => {
    const count = 3;
    for (let position = count * 66; position < 100000; position += 500) {
        const r = getFixedVirtualRange(count, 66, 800, position);
        assert.ok(r.topPadding <= count * 66);
        assert.equal(
            r.topPadding + (r.endIndex - r.startIndex) * 66 + r.bottomPadding,
            count * 66
        );
    }
});

test("returning upward restores the correct rows after a long footer or queue shrink", () => {
    getFixedVirtualRange(5000, 66, 600, 300000);
    const small = getFixedVirtualRange(3, 66, 600, 300000);
    assert.equal(small.startIndex, 3);
    assert.equal(small.endIndex, 3);
    const top = getFixedVirtualRange(3, 66, 600, 0);
    assert.equal(top.startIndex, 0);
    assert.equal(top.endIndex, 3);
    assert.equal(top.topPadding, 0);
});

function clock() {
    let next = 0;
    const frames = new Map();
    const win = {
        requestAnimationFrame(callback) {
            assert.equal(this, win);
            frames.set(++next, callback);
            return next;
        },
        cancelAnimationFrame(id) {
            assert.equal(this, win);
            frames.delete(id);
        },
    };
    return {
        win,
        frames,
        tick() {
            const callbacks = [...frames.values()];
            frames.clear();
            for (const callback of callbacks) callback();
        },
    };
}

test("PiP vinyl advances using its visible window while the opener clock is suspended", () => {
    const pip = clock();
    const disc = { ownerDocument: { defaultView: pip.win }, style: {} };
    const stop = startVinylRotation(disc, () => true);
    pip.tick();
    const initial = disc.style.transform;
    for (let i = 0; i < 20; i++) pip.tick();
    assert.match(disc.style.transform, /^rotate\([\d.]+deg\)$/);
    assert.notEqual(disc.style.transform, initial);
    stop();
    assert.equal(pip.frames.size, 0);
});

test("each vinyl owns its clock and unmount cancels only that document's pending frame", () => {
    const main = clock(),
        pip = clock();
    const a = { ownerDocument: { defaultView: main.win }, style: {} };
    const b = { ownerDocument: { defaultView: pip.win }, style: {} };
    const stopMain = startVinylRotation(a, () => true);
    const stopPip = startVinylRotation(b, () => true);
    main.tick();
    pip.tick();
    stopPip();
    assert.equal(pip.frames.size, 0);
    assert.equal(main.frames.size, 1);
    const rotation = a.style.transform;
    main.tick();
    assert.notEqual(a.style.transform, rotation);
    stopMain();
    assert.equal(main.frames.size, 0);
});

test("vinyl pause decelerates to rest and resume continues the same rotation", () => {
    const pip = clock();
    let playing = true;
    const disc = { ownerDocument: { defaultView: pip.win }, style: {} };
    const stop = startVinylRotation(disc, () => playing);
    for (let i = 0; i < 120; i++) pip.tick();
    playing = false;
    for (let i = 0; i < 500; i++) pip.tick();
    const stopped = disc.style.transform;
    pip.tick();
    assert.equal(disc.style.transform, stopped);
    playing = true;
    pip.tick();
    assert.notEqual(disc.style.transform, stopped);
    stop();
});

test("a detached document without a window needs no global animation clock", () => {
    const disc = { ownerDocument: { defaultView: null }, style: {} };
    const stop = startVinylRotation(disc, () => true);
    stop();
    assert.equal(disc.style.transform, undefined);
});

test("external recommendations replace local picks; empty or failed discovery falls back locally", () => {
    const { buildRecommendationQueue } = context.helpers;
    const song = { publicId: "local" };
    const external = { publicId: "external", name: "Last.fm pick" };
    for (const status of ["ok", "empty", "unavailable", "disabled"]) {
        const result = buildRecommendationQueue(
            {
                songs: [song, song],
                discover: status === "ok" ? [external, external] : [],
                discoverStatus: status,
            },
            new Set()
        );
        assert.equal(result.length, 1);
        assert.equal(result[0].kind, status === "ok" ? "discover" : "song");
    }
    const filtered = buildRecommendationQueue(
        { songs: [song], discover: [external] },
        new Set(["external"])
    );
    assert.equal(filtered[0].kind, "song");
    assert.equal(
        buildRecommendationQueue(
            { songs: [song], discover: [] },
            new Set(["local"])
        ).length,
        0
    );
});

test("artwork requests share cache/inflight work and never exceed two concurrent lookups", async () => {
    const started = [],
        release = [];
    context.artworkFixture = {
        http: {
            getRecommendationArtwork: (_provider, _artist, track) => {
                started.push(track);
                return new Promise((resolve) =>
                    release.push(() =>
                        resolve({
                            isOk: () => true,
                            result: {
                                imageUrl: "https://covers.example/" + track,
                            },
                        })
                    )
                );
            },
        },
    };
    const manager = new context.helpers.RecommendationArtworkManager();
    const a = manager.resolveAsync("External", "Artist", "A");
    assert.equal(manager.resolveAsync("External", "Artist", "A"), a);
    const b = manager.resolveAsync("External", "Artist", "B");
    const c = manager.resolveAsync("External", "Artist", "C");
    assert.deepEqual(started, ["A", "B"]);
    release.shift()();
    await a;
    assert.deepEqual(started, ["A", "B", "C"]);
    release.shift()();
    release.shift()();
    await Promise.all([b, c]);
    assert.equal(
        await manager.resolveAsync("External", "Artist", "A"),
        "https://covers.example/A"
    );
    assert.equal(started.length, 3);
});
