import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { act, createElement } from "react";
import { build } from "esbuild";
import { atom } from "nanostores";
import { createRoot } from "test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { outputFiles } = await build({
    stdin: {
        contents: `export { useListeningHeatmap } from '@/hooks/useListeningHeatmap';
export { listeningHeatmapManager } from '@/lib/managers/listeningHeatmapManager';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    external: ["react"],
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "playback-fixture",
            setup(builder) {
                const mocks = {
                    "@/lib/http": "export const Http = fixture.http;",
                    "@/lib/rockit/rockIt":
                        "export const rockIt = fixture.runtime;",
                };
                builder.onResolve({ filter: /.*/ }, ({ path }) =>
                    path in mocks ? { path, namespace: "fixture" } : undefined
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixture" },
                    ({ path }) => ({ contents: mocks[path] })
                );
            },
        },
    ],
});
function setup() {
    const requests = [];
    const runtime = {
        mediaPlayerManager: {
            playingAtom: atom(true),
            currentTimeAtom: atom(0),
        },
        queueManager: { currentMedia: { publicId: "one" } },
    };
    const fixture = {
        runtime,
        http: {
            getListeningHeatmap(publicId) {
                return new Promise((resolve) =>
                    requests.push({
                        publicId,
                        resolve: (segments) =>
                            resolve({
                                isNotOk: () => false,
                                result: { segments },
                            }),
                    })
                );
            },
        },
    };
    const module = { exports: {} };
    new Function(
        "require",
        "module",
        "exports",
        "fixture",
        outputFiles[0].text
    )(createRequire(import.meta.url), module, module.exports, fixture);
    return { ...module.exports, runtime, requests };
}

test("playback adds exactly one listen before the cursor, including gaps, without mutating the response", () => {
    const { listeningHeatmapManager: manager } = setup();
    const baseline = [
        { startMs: 0, endMs: 1000, count: 3 },
        { startMs: 2000, endMs: 4000, count: 2 },
    ];
    assert.deepEqual(manager.withPlayback(baseline, 3), [
        { startMs: 0, endMs: 1000, count: 4 },
        { startMs: 1000, endMs: 2000, count: 1 },
        { startMs: 2000, endMs: 3000, count: 3 },
        { startMs: 3000, endMs: 4000, count: 2 },
    ]);
    assert.equal(baseline[0].count, 3);
    assert.deepEqual(manager.withPlayback([], 2), [
        { startMs: 0, endMs: 2000, count: 1 },
    ]);
    assert.equal(manager.withPlayback(baseline, 0), baseline);
    assert.equal(manager.withPlayback(baseline, NaN), baseline);
});

test("the heatmap loads once per media and projects the live cursor while preserving paused history", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval"] });
    const { useListeningHeatmap, runtime, requests } = setup();
    const player = runtime.mediaPlayerManager;
    let snapshot;
    function Probe({ publicId }) {
        snapshot = useListeningHeatmap(publicId);
        return null;
    }
    const root = createRoot();
    await act(() => root.render(createElement(Probe, { publicId: "one" })));
    await act(() => player.currentTimeAtom.set(2));
    await act(() =>
        requests[0].resolve([{ startMs: 0, endMs: 10000, count: 3 }])
    );
    assert.deepEqual(snapshot.segments, [
        { startMs: 0, endMs: 2000, count: 4 },
        { startMs: 2000, endMs: 10000, count: 3 },
    ]);
    await act(() => {
        t.mock.timers.tick(120000);
        player.currentTimeAtom.set(4);
    });
    assert.equal(requests.length, 1);
    assert.equal(snapshot.segments[0].endMs, 4000);
    await act(() => player.playingAtom.set(false));
    await act(() => player.currentTimeAtom.set(8));
    assert.equal(snapshot.segments[0].endMs, 4000);
    await act(() => player.playingAtom.set(true));
    assert.equal(snapshot.segments[0].endMs, 8000);
    await act(() => player.currentTimeAtom.set(1));
    assert.equal(snapshot.segments[0].endMs, 1000);
    runtime.queueManager.currentMedia = { publicId: "two" };
    await act(() => root.render(createElement(Probe, { publicId: "two" })));
    assert.equal(snapshot.status, "loading");
    assert.equal(requests.length, 2);
    await act(() => requests[1].resolve([]));
    assert.deepEqual(snapshot.segments, [
        { startMs: 0, endMs: 1000, count: 1 },
    ]);
    await act(() => root.unmount());
    assert.equal(player.currentTimeAtom.lc, 0);
    assert.equal(player.playingAtom.lc, 0);
});

test("a response for the previous media cannot replace the current heatmap", async () => {
    const { useListeningHeatmap, requests } = setup();
    let snapshot;
    function Probe({ publicId }) {
        snapshot = useListeningHeatmap(publicId);
        return null;
    }
    const root = createRoot();
    await act(() => root.render(createElement(Probe, { publicId: "one" })));
    await act(() => root.render(createElement(Probe, { publicId: "two" })));
    await act(() =>
        requests[1].resolve([{ startMs: 0, endMs: 1000, count: 2 }])
    );
    await act(() =>
        requests[0].resolve([{ startMs: 0, endMs: 1000, count: 9 }])
    );
    assert.equal(snapshot.publicId, "two");
    assert.equal(snapshot.segments[0].count, 2);
    await act(() => root.unmount());
});
