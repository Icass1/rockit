import assert from "node:assert/strict";
import { test } from "node:test";
import { CollectionPager } from "@/managers/collectionPager";
import { CollectionTree } from "@/managers/collectionTree";
import { VirtualRowLayout } from "@/managers/virtualRowLayout";
import { setRockIt, type IRockItContainer } from "@/rockit/rockitRef";
import type { CollectionTreeRow } from "@/models/interfaces/collectionTree";
import type { TMedia } from "@/models/types/media";

function media(publicId: string, type = "song"): TMedia {
    return { publicId, type } as TMedia;
}
function createTree(
    items: TMedia[],
    expandedByMediaId: Record<string, boolean> = {}
): CollectionTree {
    return new CollectionTree(
        new CollectionPager("root", { media: items, expandedByMediaId }),
        { showMediaIndex: false, showMediaImage: true }
    );
}
function controls(
    tree: CollectionTree,
    key: string
): Extract<CollectionTreeRow, { kind: "controls" }> {
    const row = tree.rows
        .get()
        .find((row) => row.kind === "controls" && row.collectionKey === key);
    assert(row?.kind === "controls");
    return row;
}

test("duplicate memberships expand independently and retain loaded children on collapse", async (context) => {
    context.mock.method(CollectionPager.prototype, "load", async () => {});
    const tree = createTree([media("album", "album"), media("album", "album")]);
    tree.start();
    assert.equal(tree.toggle("root/0:album"), true);
    const child = controls(tree, "root/0:album").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("a"), media("a")],
        expandedByMediaId: {},
        collection: { type: "album" } as NonNullable<
            ReturnType<typeof child.state.get>["collection"]
        >,
    });
    const rows = tree.rows.get().filter((row) => row.kind === "media");
    assert.deepEqual(
        rows.map((row) => [row.media.publicId, row.depth, row.index]),
        [
            ["album", 0, 0],
            ["a", 1, 0],
            ["a", 1, 1],
            ["album", 0, 1],
        ]
    );
    assert.equal(
        new Set(tree.rows.get().map((row) => row.key)).size,
        tree.rows.get().length
    );
    assert(rows[1]?.showMediaIndex);
    assert.equal(rows[1]?.parentPublicId, "album");
    assert.equal(rows[3]?.expanded, false);
    tree.toggle("root/0:album");
    assert.equal(
        tree.rows.get().filter((row) => row.kind === "media").length,
        2
    );
    tree.toggle("root/0:album");
    assert.equal(controls(tree, "root/0:album").pager, child);
    assert.equal(child.state.get().media.length, 2);
    tree.stop();
});

test("persisted expansion is lazy and ancestor cycles never create recursive viewports", (context) => {
    let loads = 0;
    context.mock.method(CollectionPager.prototype, "load", async () => {
        loads++;
    });
    const tree = createTree([media("child", "playlist")], { child: true });
    tree.start();
    assert.equal(loads, 0);
    tree.ensureLoaded("root/0:child");
    assert.equal(loads, 1);
    const child = controls(tree, "root/0:child").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("root", "playlist")],
        expandedByMediaId: { root: true },
    });
    const cycle = tree.rows
        .get()
        .find((row) => row.kind === "media" && row.media.publicId === "root");
    assert(cycle?.kind === "media" && cycle.cycle && !cycle.expanded);
    assert.equal(tree.toggle(cycle.key), false);
    assert.equal(
        tree.rows.get().filter((row) => row.kind === "controls").length,
        2
    );
    tree.stop();
});

test("nested page appends preserve occurrence paths and search discards old child state", (context) => {
    context.mock.method(CollectionPager.prototype, "load", async () => {});
    const tree = createTree([media("child", "playlist")]);
    tree.start();
    tree.toggle("root/0:child");
    const child = controls(tree, "root/0:child").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("first")],
        hasMore: true,
    });
    const firstKey = tree.rows
        .get()
        .find(
            (row) => row.kind === "media" && row.media.publicId === "first"
        )!.key;
    child.state.set({
        ...child.state.get(),
        media: [media("first"), media("second")],
    });
    assert(tree.rows.get().some((row) => row.key === firstKey));
    tree.root.state.set({
        ...tree.root.state.get(),
        query: "new",
        media: [media("result")],
    });
    child.state.set({ ...child.state.get(), media: [media("stale")] });
    assert.deepEqual(
        tree.rows
            .get()
            .filter((row) => row.kind === "media")
            .map((row) => row.media.publicId),
        ["result"]
    );
    tree.stop();
});

test("measured geometry bounds a 20,000-row viewport and anchors insertions and resize", () => {
    const keys = Array.from({ length: 20000 }, (_, index) => `row-${index}`);
    const layout = new VirtualRowLayout(keys, new Map());
    const range = layout.range(680000, 800);
    assert(range.end - range.start < 30);
    assert.equal(layout.indexAt(680000), 10000);
    const resized = new VirtualRowLayout(keys, new Map([["row-1", 268]]));
    assert.equal(resized.anchorDelta(layout, 680000), 200);
    const expanded = new VirtualRowLayout(
        [...keys.slice(0, 2), "nested-1", "nested-2", ...keys.slice(2)],
        new Map()
    );
    assert.equal(expanded.anchorDelta(layout, 680000), 136);
    assert.deepEqual(new VirtualRowLayout([], new Map()).range(0, 800), {
        start: 0,
        end: 0,
    });
    assert.equal(layout.total, 20000 * 68);
});

test("searching a nested collection invalidates descendants without closing its ancestors", (context) => {
    context.mock.method(CollectionPager.prototype, "load", async () => {});
    const tree = createTree([media("child", "playlist")]);
    tree.start();
    tree.toggle("root/0:child");
    const child = controls(tree, "root/0:child").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("inner", "playlist")],
        expandedByMediaId: { inner: true },
    });
    const inner = controls(tree, "root/0:child/0:inner").pager;
    inner.state.set({ ...inner.state.get(), media: [media("old")] });
    child.state.set({
        ...child.state.get(),
        query: "new",
        media: [media("new")],
        expandedByMediaId: {},
    });
    inner.state.set({ ...inner.state.get(), media: [media("stale")] });
    const rows = tree.rows.get().filter((row) => row.kind === "media");
    assert.deepEqual(
        rows.map((row) => row.media.publicId),
        ["child", "new"]
    );
    assert(rows[0]?.expanded);
    assert.equal(rows[1]?.depth, 1);
    tree.stop();
});

test("nested mutations invalidate cached contents without loading closed collections", (context) => {
    let loads = 0;
    context.mock.method(CollectionPager.prototype, "load", async () => {
        loads++;
    });
    const tree = createTree([media("child", "playlist")]);
    tree.start();
    tree.toggle("root/0:child");
    const child = controls(tree, "root/0:child").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("old")],
        collection: { type: "playlist" } as NonNullable<
            ReturnType<typeof child.state.get>["collection"]
        >,
    });
    tree.toggle("root/0:child");
    tree.refreshNested("child");
    assert.equal(loads, 1);
    assert.equal(child.state.get().media.length, 0);
    tree.toggle("root/0:child");
    assert.equal(loads, 2);
    tree.stop();
});

test("download metadata updates cached occurrences while their nested collection is closed", async (context) => {
    context.mock.method(CollectionPager.prototype, "load", async () => {});
    const tree = createTree([media("child", "playlist"), media("track")]);
    tree.start();
    tree.toggle("root/0:child");
    const child = controls(tree, "root/0:child").pager;
    child.state.set({
        ...child.state.get(),
        media: [media("track")],
        collection: { type: "playlist" } as NonNullable<
            ReturnType<typeof child.state.get>["collection"]
        >,
    });
    tree.toggle("root/0:child");
    const updated = { ...media("track"), name: "Downloaded" } as TMedia;
    let requests = 0;
    setRockIt({
        http: {
            getMediaAsync: async () => {
                requests++;
                return { isOk: () => true, result: { media: updated } };
            },
        },
    } as unknown as IRockItContainer);
    await tree.refreshMediaAsync("unloaded-track");
    assert.equal(requests, 0);
    await tree.refreshMediaAsync("track");
    assert.equal(requests, 1);
    assert.equal(child.state.get().media[0], updated);
    assert.equal(tree.root.state.get().media[1], updated);
    tree.toggle("root/0:child");
    assert.equal(
        controls(tree, "root/0:child").pager.state.get().media[0],
        updated
    );
    tree.stop();
});
