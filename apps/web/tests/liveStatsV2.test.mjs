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
        contents: `export { useLiveStatsV2 } from '@/hooks/useLiveStatsV2';`,
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
            name: "stats-fixture",
            setup(builder) {
                const mocks = {
                    "@/lib/rockit/rockIt":
                        "export const rockIt = fixture.runtime;",
                    "@rockit/shared":
                        "export const EWebSocketMessage = { MediaListened: 'listened' };",
                    "@/components/providers/VocabularyProvider":
                        "export const useVocabulary = () => ({ MOBILE_STATS_ERROR: 'Stats unavailable' });",
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
    const handlers = new Set();
    const errors = [];
    const playing = atom(true);
    const fixture = {
        runtime: {
            mediaPlayerManager: { playingAtom: playing },
            notificationManager: {
                notifyError: (message) => errors.push(message),
            },
            webSocketManager: {
                onMessage: (_, handler) => handlers.add(handler),
                offMessage: (_, handler) => handlers.delete(handler),
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
    let snapshot;
    function Probe({ fetchStats }) {
        snapshot = module.exports.useLiveStatsV2(fetchStats);
        return null;
    }
    const fetchStats = () =>
        new Promise((resolve, reject) =>
            requests.push({
                resolve: (result) => resolve({ isOk: () => true, result }),
                fail: (message) => resolve({ isOk: () => false, message }),
                reject,
            })
        );
    return {
        Probe,
        fetchStats,
        requests,
        playing,
        handlers,
        errors,
        snapshot: () => snapshot,
    };
}

test("stats refresh every 15 seconds during playback and retain visible data until replacement", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval"] });
    const f = setup();
    const root = createRoot();
    await act(async () =>
        root.render(createElement(f.Probe, { fetchStats: f.fetchStats }))
    );
    assert.equal(f.snapshot().loading, true);
    const first = { summary: { totalMinutes: 10 } };
    const second = { summary: { totalMinutes: 11 } };
    await act(async () => f.requests[0].resolve(first));
    await act(async () => t.mock.timers.tick(14999));
    assert.equal(f.requests.length, 1);
    await act(async () => t.mock.timers.tick(1));
    assert.equal(f.requests.length, 2);
    assert.equal(f.snapshot().data, first);
    assert.equal(f.snapshot().loading, false);
    // A slow refresh cannot overlap with the timer or a websocket event.
    await act(async () => {
        t.mock.timers.tick(30000);
        f.handlers.forEach((handler) => handler());
    });
    assert.equal(f.requests.length, 2);
    await act(async () => f.requests[1].resolve(second));
    assert.equal(f.snapshot().data, second);
    assert.equal(f.snapshot().loading, false);
    await act(async () => f.playing.set(false));
    await act(async () => t.mock.timers.tick(60000));
    assert.equal(f.requests.length, 2);
    await act(async () => f.playing.set(true));
    await act(async () => t.mock.timers.tick(15000));
    assert.equal(f.requests.length, 3);
    await act(async () => f.requests[2].fail("Offline"));
    assert.equal(f.snapshot().data, second);
    assert.equal(f.snapshot().error, "Offline");
    assert.deepEqual(f.errors, ["Offline"]);
    await act(async () => f.handlers.forEach((handler) => handler()));
    await act(async () => f.requests[3].resolve(first));
    assert.equal(f.snapshot().error, undefined);
    assert.equal(f.snapshot().data, first);
    await act(async () => root.unmount());
    assert.equal(f.playing.lc, 0);
    assert.equal(f.handlers.size, 0);
    await act(async () => t.mock.timers.tick(60000));
    assert.equal(f.requests.length, 4);
});

test("changing ranges ignores stale responses and rejected refreshes retain existing data", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval"] });
    const f = setup();
    const root = createRoot();
    await act(async () =>
        root.render(createElement(f.Probe, { fetchStats: f.fetchStats }))
    );
    const nextRange = () => f.fetchStats();
    await act(async () =>
        root.render(createElement(f.Probe, { fetchStats: nextRange }))
    );
    const latest = { summary: { totalMinutes: 20 } };
    await act(async () => f.requests[1].resolve(latest));
    await act(async () =>
        f.requests[0].resolve({ summary: { totalMinutes: 1 } })
    );
    assert.equal(f.snapshot().data, latest);
    await act(async () => t.mock.timers.tick(15000));
    await act(async () => f.requests[2].reject(new Error("network")));
    assert.equal(f.snapshot().data, latest);
    assert.equal(f.snapshot().loading, false);
    assert.equal(f.snapshot().error, "Stats unavailable");
    await act(async () => root.unmount());
});
