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
                    "@nanostores/react": "export const useStore = () => true;",
                    "@/hooks/useAccountCachedData":
                        "export default () => ({ data: globalThis.libraryData, loading: false });",
                    "@/lib/rockit/rockIt":
                        "export const rockIt = { userManager: {} };",
                    "@/lib/http": "export const Http = {};",
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
    return { context, ...context.module.exports };
}

test("library fallback arrays stay stable before the reducer effect commits", () => {
    const { context, useLibraryData } = setup();
    context.libraryData = library(["cached-song"]);
    const snapshots = [];
    function Probe() {
        const [stage, setStage] = useState(0);
        const { filtered } = useLibraryData({ filterMode: 0, searchQuery: "" });
        snapshots.push(filtered);
        if (stage === 0) setStage(1);
        return null;
    }
    renderToString(createElement(Probe));
    assert.equal(snapshots.length, 2);
    assert.equal(snapshots[0], snapshots[1]);
});

test("loading, cached, live and cleared library snapshots render without a loop", () => {
    const { context, useLibraryData, useIncrementalList } = setup();
    const cached = library(["cached-song"]);
    const live = library(["live-song", "another-song"]);
    const snapshots = [undefined, cached, cached, live, live, undefined];
    const rendered = [];
    function Probe() {
        const [stage, setStage] = useState(0);
        context.libraryData = snapshots[stage];
        const { filtered } = useLibraryData({ filterMode: 0, searchQuery: "" });
        const songs = useIncrementalList(filtered.songs, false);
        useIncrementalList(filtered.videos, false);
        rendered.push(Array.from(songs, (song) => song.publicId));
        if (stage < snapshots.length - 1) setStage(stage + 1);
        return null;
    }
    assert.doesNotThrow(() => renderToString(createElement(Probe)));
    assert.deepEqual(rendered, [
        [],
        ["cached-song"],
        ["cached-song"],
        ["live-song", "another-song"],
        ["live-song", "another-song"],
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
