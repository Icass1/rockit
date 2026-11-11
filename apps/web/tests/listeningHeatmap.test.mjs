import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { act, createElement } from "react";
import { useStore } from "@nanostores/react";
import { build } from "esbuild";
import { atom } from "nanostores";
import { createRoot } from "test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { outputFiles } = await build({
    stdin: {
        contents: `export { useListeningHeatmap } from '@/hooks/useListeningHeatmap';
export { ListeningHeatmapPlayback } from '@/lib/managers/listeningHeatmapPlayback';
export { listeningHeatmapManager } from '@/lib/managers/listeningHeatmapManager';
export { listeningHeatmapCurve } from '@/lib/utils/listeningHeatmapCurve';
export { default as ListeningHeatmap } from '@/components/ListeningHeatmap/ListeningHeatmap';`,
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
                    "@/components/providers/VocabularyProvider":
                        "export const useVocabulary = () => ({});",
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
            playbackPositionAtom: atom(undefined),
            advance(time) {
                this.playbackPositionAtom.set({
                    mediaPublicId: runtime.queueManager.currentMedia.publicId,
                    playbackId: "pass-one",
                    kind: "progress",
                    timeFrom: this.currentTimeAtom.get(),
                    timeTo: time,
                    seeking: false,
                });
                this.currentTimeAtom.set(time);
            },
            seek(time, seeking = false) {
                this.playbackPositionAtom.set({
                    mediaPublicId: runtime.queueManager.currentMedia.publicId,
                    playbackId: "pass-one",
                    kind: "seek",
                    timeFrom: this.currentTimeAtom.get(),
                    timeTo: time,
                    seeking,
                });
                this.currentTimeAtom.set(time);
            },
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
        "document",
        outputFiles[0].text
    )(createRequire(import.meta.url), module, module.exports, fixture, {
        addEventListener() {},
        removeEventListener() {},
    });
    return { ...module.exports, runtime, requests };
}

test("playback adds exactly one listen before the cursor, including gaps, without mutating the response", () => {
    const { listeningHeatmapManager: manager } = setup();
    const baseline = [
        { startMs: 0, endMs: 1000, count: 3 },
        { startMs: 2000, endMs: 4000, count: 2 },
    ];
    assert.deepEqual(
        manager.withPlayback(baseline, [{ startMs: 0, endMs: 3000 }]),
        [
            { startMs: 0, endMs: 1000, count: 4 },
            { startMs: 1000, endMs: 2000, count: 1 },
            { startMs: 2000, endMs: 3000, count: 3 },
            { startMs: 3000, endMs: 4000, count: 2 },
        ]
    );
    assert.equal(baseline[0].count, 3);
    assert.deepEqual(manager.withPlayback([], [{ startMs: 0, endMs: 2000 }]), [
        { startMs: 0, endMs: 2000, count: 1 },
    ]);
    assert.deepEqual(manager.withPlayback(baseline, []), baseline);
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
    await act(() => player.advance(2));
    await act(() =>
        requests[0].resolve([{ startMs: 0, endMs: 10000, count: 3 }])
    );
    assert.deepEqual(snapshot.segments, [
        { startMs: 0, endMs: 2000, count: 4 },
        { startMs: 2000, endMs: 10000, count: 3 },
    ]);
    await act(() => {
        t.mock.timers.tick(120000);
        player.advance(4);
    });
    assert.equal(requests.length, 1);
    assert.equal(snapshot.segments[0].endMs, 4000);
    await act(() => player.playingAtom.set(false));
    await act(() => player.seek(8));
    assert.equal(snapshot.segments[0].endMs, 4000);
    await act(() => player.playingAtom.set(true));
    assert.equal(snapshot.segments[0].endMs, 4000);
    await act(() => player.seek(1));
    assert.equal(snapshot.segments[0].endMs, 4000);
    runtime.queueManager.currentMedia = { publicId: "two" };
    await act(() => root.render(createElement(Probe, { publicId: "two" })));
    assert.equal(snapshot.status, "loading");
    assert.equal(requests.length, 2);
    await act(() => requests[1].resolve([]));
    assert.deepEqual(snapshot.segments, []);
    await act(async () => player.advance(1.5));
    assert.deepEqual(snapshot.segments, [
        { startMs: 1000, endMs: 1500, count: 1 },
    ]);
    await act(() => root.unmount());
    assert.equal(player.currentTimeAtom.lc, 0);
    assert.equal(player.playingAtom.lc, 0);
    assert.equal(player.playbackPositionAtom.lc, 0);
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

test("equal listening counts form a flat plateau with the actual values at both edges", () => {
    const { listeningHeatmapCurve: curve } = setup();
    assert.equal(
        curve([{ startMs: 0, endMs: 171000, count: 3 }], 171, 3),
        "M 0,4 L 1000,4"
    );
    const stepped = curve(
        [
            { startMs: 0, endMs: 133000, count: 3 },
            { startMs: 133000, endMs: 171000, count: 2 },
        ],
        171,
        3
    );
    assert.ok(stepped.startsWith("M 0,4 L 767."));
    assert.ok(stepped.endsWith(` L 1000,${98 - (2 / 3) * 94}`));
    // Adjacent backend intervals with equal counts do not introduce a new bend.
    assert.equal(
        curve(
            [
                { startMs: 0, endMs: 500, count: 3 },
                { startMs: 500, endMs: 1000, count: 3 },
            ],
            1,
            3
        ),
        "M 0,4 L 1000,4"
    );
});

test("rounded transitions preserve unheard gaps, short segments and real timeline edges", () => {
    const { listeningHeatmapCurve: curve } = setup();
    const line = curve(
        [
            { startMs: 1000, endMs: 2000, count: 3 },
            { startMs: 2001, endMs: 3000, count: 2 },
        ],
        4,
        3
    );
    assert.ok(line.startsWith("M 0,98 L 240,98 C"));
    assert.ok(line.endsWith(" L 1000,98"));
    assert.ok(!line.includes("NaN"));
    const coordinates = [...line.matchAll(/(?:M|L|C) ([^MLC]+)/g)].flatMap(
        (match) =>
            match[1]
                .trim()
                .split(/\s+/)
                .map((pair) => pair.split(",").map(Number))
    );
    assert.ok(
        coordinates.every(([x, y]) => x >= 0 && x <= 1000 && y >= 4 && y <= 98)
    );
    assert.ok(
        coordinates.every(
            ([x], index) => index === 0 || x >= coordinates[index - 1][0]
        )
    );
    assert.equal(curve([], 0, 0), "");
    assert.equal(curve([], 4, 0), "");
});

test("the current listen count stays on the third listen across fractional clock updates and paused seeks", async () => {
    const { ListeningHeatmap, runtime, requests } = setup();
    const player = runtime.mediaPlayerManager;
    function Probe() {
        const currentTime = useStore(player.currentTimeAtom);
        return createElement(ListeningHeatmap, {
            publicId: "one",
            duration: 10,
            currentTime,
        });
    }
    const root = createRoot();
    try {
        await act(async () => root.render(createElement(Probe)));
        await act(async () =>
            requests[0].resolve([{ startMs: 0, endMs: 10000, count: 2 }])
        );
        await act(async () =>
            root.container
                .queryAll(
                    (node) =>
                        node.type === "button" &&
                        node.props["aria-label"] === "Listening history"
                )[0]
                .props.onClick()
        );
        const count = () =>
            root.container.queryAll(
                (node) =>
                    node.type === "p" &&
                    node.props.className ===
                        "text-base font-semibold tabular-nums"
            )[2].children[0];
        for (const time of [
            1, 1.0001, 1.0006, 1.001, 1.0014, 1.0018, 2, 2.9999, 3.0001,
        ]) {
            await act(async () => player.advance(time));
            assert.equal(count(), "3", `count at ${time}s`);
        }
        await act(async () => player.playingAtom.set(false));
        assert.equal(count(), "3");
        await act(async () => player.seek(8));
        assert.equal(count(), "2");
        await act(async () => player.seek(1));
        assert.equal(count(), "3");
        await act(async () => player.playingAtom.set(true));
        assert.equal(count(), "4");
        await act(async () => player.advance(10));
        assert.equal(count(), "3");
        assert.equal(requests.length, 1);
    } finally {
        await act(async () => root.unmount());
    }
});

test("cursor counts preserve backend boundaries and unheard gaps while including only the live pass", () => {
    const { listeningHeatmapManager: manager } = setup();
    const baseline = [
        { startMs: 0, endMs: 1000, count: 2 },
        { startMs: 1000, endMs: 2000, count: 4 },
        { startMs: 3000, endMs: 4000, count: 3 },
    ];
    assert.equal(manager.countAt(baseline, 0), 2);
    assert.equal(manager.countAt(baseline, 0, [], { startMs: 0, endMs: 0 }), 3);
    assert.equal(
        manager.countAt(baseline, 0.9999, [], { startMs: 0, endMs: 999.9 }),
        3
    );
    assert.equal(
        manager.countAt(baseline, 1, [], { startMs: 0, endMs: 1000 }),
        5
    );
    assert.equal(
        manager.countAt(baseline, 2.5, [], { startMs: 0, endMs: 2500 }),
        1
    );
    assert.equal(
        manager.countAt(baseline, 3.5, [], { startMs: 0, endMs: 1000 }),
        3
    );
    assert.equal(
        manager.countAt(baseline, 4, [], { startMs: 0, endMs: 4000 }),
        4
    );
    assert.equal(manager.countAt([], 1, [], { startMs: 0, endMs: 1000 }), 1);
    assert.equal(manager.countAt(baseline, NaN), 0);
});

test("forward seeks preserve played sections and leave the skipped middle unchanged without refetching", async () => {
    const { useListeningHeatmap, runtime, requests } = setup();
    const player = runtime.mediaPlayerManager;
    let snapshot;
    function Probe() {
        snapshot = useListeningHeatmap("one");
        return null;
    }
    const root = createRoot();
    try {
        await act(async () => root.render(createElement(Probe)));
        await act(async () =>
            requests[0].resolve([{ startMs: 0, endMs: 180000, count: 2 }])
        );
        await act(async () => player.advance(10));
        await act(async () => player.seek(120));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 10000, count: 3 },
            { startMs: 10000, endMs: 180000, count: 2 },
        ]);
        await act(async () => player.advance(130));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 10000, count: 3 },
            { startMs: 10000, endMs: 120000, count: 2 },
            { startMs: 120000, endMs: 130000, count: 3 },
            { startMs: 130000, endMs: 180000, count: 2 },
        ]);
        // Replay part of the first interval; both earlier intervals survive.
        await act(async () => player.seek(5));
        await act(async () => player.advance(8));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 5000, count: 3 },
            { startMs: 5000, endMs: 8000, count: 4 },
            { startMs: 8000, endMs: 10000, count: 3 },
            { startMs: 10000, endMs: 120000, count: 2 },
            { startMs: 120000, endMs: 130000, count: 3 },
            { startMs: 130000, endMs: 180000, count: 2 },
        ]);
        assert.equal(snapshot.currentCount, 4);
        assert.equal(requests.length, 1);
    } finally {
        await act(async () => root.unmount());
    }
});

test("drag previews and paused seeks never become listening intervals", async () => {
    const { useListeningHeatmap, runtime, requests } = setup();
    const player = runtime.mediaPlayerManager;
    let snapshot;
    function Probe() {
        snapshot = useListeningHeatmap("one");
        return null;
    }
    const root = createRoot();
    try {
        await act(async () => root.render(createElement(Probe)));
        await act(async () => requests[0].resolve([]));
        await act(async () => player.advance(2));
        for (const time of [2, 15, 30, 90])
            await act(async () => player.seek(time, true));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 2000, count: 1 },
        ]);
        await act(async () => player.seek(90));
        await act(async () => player.advance(92));
        await act(async () => player.playingAtom.set(false));
        await act(async () => player.seek(50));
        await act(async () => player.seek(70));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 2000, count: 1 },
            { startMs: 90000, endMs: 92000, count: 1 },
        ]);
        assert.equal(snapshot.currentCount, 0);
        await act(async () => player.playingAtom.set(true));
        await act(async () => player.advance(71));
        assert.deepEqual(snapshot.segments, [
            { startMs: 0, endMs: 2000, count: 1 },
            { startMs: 70000, endMs: 71000, count: 1 },
            { startMs: 90000, endMs: 92000, count: 1 },
        ]);
        assert.equal(requests.length, 1);
    } finally {
        await act(async () => root.unmount());
    }
});

test("joining playback midway starts at the observed position and ignores remote media samples", async () => {
    const { useListeningHeatmap, runtime, requests } = setup();
    const player = runtime.mediaPlayerManager;
    player.currentTimeAtom.set(60);
    let snapshot;
    function Probe() {
        snapshot = useListeningHeatmap("one");
        return null;
    }
    const root = createRoot();
    try {
        await act(async () => root.render(createElement(Probe)));
        await act(async () => player.advance(61));
        await act(async () => requests[0].resolve([]));
        assert.deepEqual(snapshot.segments, [
            { startMs: 60000, endMs: 61000, count: 1 },
        ]);
        await act(async () =>
            player.playbackPositionAtom.set({
                mediaPublicId: "other",
                playbackId: "other",
                kind: "progress",
                timeFrom: 0,
                timeTo: 100,
                seeking: false,
            })
        );
        assert.deepEqual(snapshot.segments, [
            { startMs: 60000, endMs: 61000, count: 1 },
        ]);
    } finally {
        await act(async () => root.unmount());
    }
});

test("resource start offsets and repeated playbacks preserve distinct real intervals", () => {
    const { ListeningHeatmapPlayback, listeningHeatmapManager: manager } =
        setup();
    const playback = new ListeningHeatmapPlayback(false, 0);
    playback.observe({
        kind: "seek",
        mediaPublicId: "one",
        playbackId: "first",
        timeFrom: 5,
        timeTo: 5,
        seeking: false,
    });
    playback.setPlaying(true, 0);
    playback.observe({
        kind: "progress",
        mediaPublicId: "one",
        playbackId: "first",
        timeFrom: 0,
        timeTo: 10,
        seeking: false,
    });
    assert.deepEqual(manager.withPlayback([], playback.intervals), [
        { startMs: 5000, endMs: 10000, count: 1 },
    ]);
    playback.observe({
        kind: "progress",
        mediaPublicId: "one",
        playbackId: "second",
        timeFrom: 5,
        timeTo: 7,
        seeking: false,
    });
    assert.deepEqual(manager.withPlayback([], playback.intervals), [
        { startMs: 5000, endMs: 7000, count: 2 },
        { startMs: 7000, endMs: 10000, count: 1 },
    ]);
});

test("a seek after pausing closes at the native pause position without adding the skipped range", () => {
    const { ListeningHeatmapPlayback, listeningHeatmapManager: manager } =
        setup();
    const playback = new ListeningHeatmapPlayback(true, 0);
    playback.observe({
        kind: "progress",
        mediaPublicId: "one",
        playbackId: "first",
        timeFrom: 0,
        timeTo: 2,
        seeking: false,
    });
    playback.setPlaying(false, 2);
    playback.observe({
        kind: "seek",
        mediaPublicId: "one",
        playbackId: "first",
        timeFrom: 2.1,
        timeTo: 50,
        seeking: false,
    });
    assert.deepEqual(manager.withPlayback([], playback.intervals), [
        { startMs: 0, endMs: 2100, count: 1 },
    ]);
});
