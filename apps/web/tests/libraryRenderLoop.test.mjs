import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { createElement, useState } from "react";
import { build } from "esbuild";
import { renderToString } from "react-dom/server";

const { outputFiles } = await build({
    stdin: {
        contents: `export { useLibraryData } from '@/components/Library/hooks/useLibraryData';
export { useIncrementalList } from '@/hooks/useIncrementalList';`,
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
            name: "library-data-sources",
            setup(builder) {
                const mocks = {
                    "@/components/providers/SessionProvider":
                        "export const useSession = () => globalThis.session;",
                    "@/lib/rockit/rockIt":
                        "export const rockIt = { userManager: {} };",
                    "@/lib/offline/db":
                        "export const loadLibraryOffline = () => {}; export const saveLibraryOffline = () => {};",
                    "@rockit/shared": "export const EEvent = {};",
                };
                builder.onResolve({ filter: /.*/ }, ({ path }) =>
                    path in mocks ? { path, namespace: "mock" } : undefined
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "mock" },
                    ({ path }) => ({
                        contents: mocks[path],
                    })
                );
            },
        },
    ],
});

const library = (ids) => ({
    albums: [],
    playlists: [],
    songs: ids.map((publicId) => ({ item: { publicId, name: publicId } })),
    videos: [],
    stations: [],
    shared: [],
});

function setup() {
    const context = vm.createContext({
        module: { exports: {} },
        require: createRequire(import.meta.url),
    });
    vm.runInContext(outputFiles[0].text, context);
    context.session = { username: "listener" };
    return { context, ...context.module.exports };
}

test("library fallback arrays stay stable before the reducer effect commits", () => {
    const { useLibraryData } = setup();
    const data = library(["server-song"]);
    const snapshots = [];
    function Probe() {
        const [stage, setStage] = useState(0);
        const { filtered } = useLibraryData({
            data,
            username: "listener",
            filterMode: 0,
            searchQuery: "",
        });
        snapshots.push(filtered);
        if (stage === 0) setStage(1);
        return null;
    }
    renderToString(createElement(Probe));
    assert.equal(snapshots.length, 2);
    assert.equal(snapshots[0], snapshots[1]);
});

test("server refreshes and account changes render without a loop or exposing another account", () => {
    const { context, useLibraryData, useIncrementalList } = setup();
    const initial = library(["server-song"]);
    const live = library(["live-song", "another-song"]);
    const snapshots = [initial, initial, live, live, live];
    const rendered = [];
    function Probe() {
        const [stage, setStage] = useState(0);
        context.session =
            stage === 3
                ? { username: "another-account" }
                : stage === 4
                  ? null
                  : { username: "listener" };
        const { filtered } = useLibraryData({
            data: snapshots[stage],
            username: "listener",
            filterMode: 0,
            searchQuery: "",
        });
        const songs = useIncrementalList(filtered.songs, false);
        useIncrementalList(filtered.videos, false);
        rendered.push(Array.from(songs, (song) => song.publicId));
        if (stage < snapshots.length - 1) setStage(stage + 1);
        return null;
    }
    assert.doesNotThrow(() => renderToString(createElement(Probe)));
    assert.deepEqual(rendered, [
        ["server-song"],
        ["server-song"],
        ["live-song", "another-song"],
        [],
        [],
    ]);
});

test("incremental lists tolerate fresh arrays and reset the visible count", () => {
    const { useIncrementalList } = setup();
    const counts = [];
    function Probe() {
        const [stage, setStage] = useState(0);
        const length = stage === 1 ? 1 : 300;
        const items = Array.from({ length }, (_, index) => index);
        counts.push(useIncrementalList(items, false).length);
        if (stage < 2) setStage(stage + 1);
        return null;
    }
    assert.doesNotThrow(() => renderToString(createElement(Probe)));
    assert.deepEqual(counts, [200, 1, 200]);
});
