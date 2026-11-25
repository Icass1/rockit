"use client";

import {
    memo,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type JSX,
} from "react";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
    CollectionTree,
    EEvent,
    isList,
    isPlayable,
    VirtualRowLayout,
    type CollectionTreeRow,
    type IMediaAddedToPlaylistEvent,
    type IMediaDownloadedEvent,
    type IMediaRemovedFromPlaylistEvent,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import CollectionControls from "@/components/RenderList/CollectionControls";
import CollectionFooter from "@/components/RenderList/CollectionFooter";
import { ListMedia } from "@/components/RenderList/ListMedia";
import { PlayableMedia } from "@/components/RenderList/PlayableMedia";

function scrollParent(element: HTMLElement): HTMLElement | null {
    if (typeof window === "undefined") return null;
    let parent = element.parentElement;
    while (parent) {
        if (/(auto|scroll)/.test(window.getComputedStyle(parent).overflowY))
            return parent;
        parent = parent.parentElement;
    }
    return null;
}

const TreeRow = memo(function TreeRow({
    row,
    tree,
    listPublicId,
    substractArtists,
}: {
    row: CollectionTreeRow;
    tree: CollectionTree;
    listPublicId: string;
    substractArtists: string[];
}): JSX.Element {
    useEffect(() => {
        if (row.kind === "controls" && row.collectionKey !== "root")
            tree.ensureLoaded(row.collectionKey);
    }, [tree, row]);
    if (row.kind === "controls")
        return (
            <CollectionControls
                pager={row.pager}
                showSearch={row.collectionKey === "root"}
            />
        );
    if (row.kind === "footer") return <CollectionFooter pager={row.pager} />;
    if (isList(row.media))
        return (
            <ListMedia
                media={row.media}
                listPublicId={listPublicId}
                expansionPlaylistPublicId={row.parentPublicId}
                expanded={row.expanded}
                cycle={row.cycle}
                onToggle={() => {
                    tree.toggle(row.key);
                }}
            />
        );
    if (isPlayable(row.media))
        return (
            <PlayableMedia
                media={row.media}
                index={row.index}
                listPublicId={listPublicId}
                substractArtists={substractArtists}
                showMediaIndex={row.showMediaIndex}
                showMediaImage={row.showMediaImage}
            />
        );
    return <div />;
});

export default function VirtualCollectionList({
    pager,
    showMediaIndex,
    showMediaImage,
    substractArtists,
}: {
    pager: CollectionPager;
    showMediaIndex: boolean;
    showMediaImage: boolean;
    substractArtists: string[];
}): JSX.Element {
    const tree = useMemo(
        () => new CollectionTree(pager, { showMediaIndex, showMediaImage }),
        [pager, showMediaIndex, showMediaImage]
    );
    const rows = useStore(tree.rows);
    const page = useStore(pager.state);
    const root = useRef<HTMLDivElement>(null);
    const [heights, setHeights] = useState(new Map<string, number>());
    const [viewport, setViewport] = useState({ offset: 0, height: 800 });
    const [focused, setFocused] = useState<string>();
    const layout = useMemo(
        () =>
            new VirtualRowLayout(
                rows.map((row) => row.key),
                heights
            ),
        [rows, heights]
    );
    const previousLayout = useRef(layout);
    const range = layout.range(viewport.offset, viewport.height);
    const visible = rows.slice(range.start, range.end);
    const focusedIndex = focused ? (layout.indices.get(focused) ?? -1) : -1;
    if (
        focusedIndex >= 0 &&
        (focusedIndex < range.start || focusedIndex >= range.end)
    )
        visible.push(rows[focusedIndex]!);
    visible.sort(
        (a, b) => layout.indices.get(a.key)! - layout.indices.get(b.key)!
    );

    useEffect(() => {
        tree.start();
        const events = rockIt.eventManager;
        const refresh = (
            event: IMediaAddedToPlaylistEvent | IMediaRemovedFromPlaylistEvent
        ): void => tree.refreshNested(event.playlistPublicId);
        const downloaded = (event: IMediaDownloadedEvent): void => {
            void tree.refreshMediaAsync(event.publicId);
        };
        events.addEventListener(EEvent.MediaDownloaded, downloaded);
        events.addEventListener(EEvent.MediaAddedToPlaylist, refresh);
        events.addEventListener(EEvent.MediaRemovedFromPlaylist, refresh);
        return () => {
            tree.stop();
            events.removeEventListener(EEvent.MediaDownloaded, downloaded);
            events.removeEventListener(EEvent.MediaAddedToPlaylist, refresh);
            events.removeEventListener(
                EEvent.MediaRemovedFromPlaylist,
                refresh
            );
        };
    }, [tree]);
    useEffect(() => {
        if (typeof window === "undefined" || !root.current) return;
        const element = root.current;
        const parent = scrollParent(element);
        const update = (): void => {
            const bounds = element.getBoundingClientRect();
            const parentBounds = scrollParent(element)?.getBoundingClientRect();
            // Screen rectangles include transforms; the row layout uses CSS pixels.
            const scale =
                element.offsetHeight > 0
                    ? bounds.height / element.offsetHeight || 1
                    : 1;
            const visualViewport = window.visualViewport;
            const viewportTop = visualViewport?.offsetTop ?? 0;
            const viewportBottom =
                viewportTop + (visualViewport?.height ?? window.innerHeight);
            const top = Math.max(viewportTop, parentBounds?.top ?? viewportTop);
            const bottom = Math.min(
                viewportBottom,
                parentBounds?.bottom ?? viewportBottom
            );
            const next = {
                offset: Math.max(0, (top - bounds.top) / scale),
                height: Math.max(
                    0,
                    (bottom - Math.max(top, bounds.top)) / scale
                ),
            };
            setViewport((previous) =>
                Math.abs(previous.offset - next.offset) < 1 &&
                Math.abs(previous.height - next.height) < 1
                    ? previous
                    : next
            );
        };
        update();
        // Capture scrolling from either the desktop column or the mobile page container.
        window.addEventListener("scroll", update, {
            passive: true,
            capture: true,
        });
        window.addEventListener("resize", update);
        window.visualViewport?.addEventListener("resize", update);
        window.visualViewport?.addEventListener("scroll", update);
        const observer = new ResizeObserver(update);
        observer.observe(element);
        if (parent) observer.observe(parent);
        // Extension zoom changes the body transform without resizing its layout box.
        const zoomObserver = new MutationObserver(update);
        for (const target of [document.documentElement, document.body])
            zoomObserver.observe(target, {
                attributes: true,
                attributeFilter: ["style", "class"],
            });
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("scroll", update);
            observer.disconnect();
            zoomObserver.disconnect();
        };
    }, [layout]);
    useLayoutEffect(() => {
        const previous = previousLayout.current;
        previousLayout.current = layout;
        if (!root.current || previous === layout || viewport.offset === 0)
            return;
        const parent = scrollParent(root.current);
        if (parent)
            parent.scrollTop += layout.anchorDelta(previous, viewport.offset);
    }, [layout, viewport.offset]);
    useLayoutEffect(() => {
        if (!root.current) return;
        const measure = (elements: Iterable<HTMLElement>): void => {
            const measurements = Array.from(elements, (element) => ({
                key: element.dataset.rowKey,
                height: element.offsetHeight,
            }));
            setHeights((previous) => {
                let next = previous;
                if (previous.size > rows.length * 2 + 1000) {
                    const keys = new Set(rows.map((row) => row.key));
                    next = new Map(
                        [...previous].filter(([key]) => keys.has(key))
                    );
                }
                for (const { key, height } of measurements) {
                    if (
                        key &&
                        height > 0 &&
                        Math.abs((next.get(key) ?? 0) - height) > 0.5
                    ) {
                        if (next === previous) next = new Map(previous);
                        next.set(key, height);
                    }
                }
                return next;
            });
        };
        const elements =
            root.current.querySelectorAll<HTMLElement>("[data-row-key]");
        // Apply actual row heights before paint instead of waiting for the observer.
        measure(elements);
        const observer = new ResizeObserver((entries) => {
            measure(entries.map((entry) => entry.target as HTMLElement));
        });
        for (const element of elements) observer.observe(element);
        return () => observer.disconnect();
    }, [rows, range.start, range.end, focused]);
    useEffect(() => {
        if (!root.current) return;
        let width = root.current.clientWidth;
        const observer = new ResizeObserver((entries) => {
            const next = entries[0]?.contentRect.width ?? width;
            if (Math.abs(next - width) > 1) {
                width = next;
                setHeights(new Map());
            }
        });
        observer.observe(root.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (page.query) root.current?.scrollIntoView({ block: "start" });
    }, [page.query]);

    return (
        <div
            ref={root}
            role="list"
            aria-label={page.collection?.name}
            className="flex flex-col"
            style={{
                height: layout.total,
                position: "relative",
                overflowAnchor: "none",
            }}
        >
            {visible.map((row, visibleIndex) => {
                const index = layout.indices.get(row.key)!;
                const previousRow = visible[visibleIndex - 1];
                // Flow gaps preserve virtual offsets, including a retained focus row,
                // without offscreen absolute elements that zoom extensions relocate.
                const previousEnd = previousRow
                    ? layout.offsets[layout.indices.get(previousRow.key)! + 1]!
                    : 0;
                return (
                    <div
                        key={row.key}
                        data-row-key={row.key}
                        role="listitem"
                        onFocusCapture={() => setFocused(row.key)}
                        onBlurCapture={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget as Node | null
                                )
                            )
                                setFocused(undefined);
                        }}
                        style={{
                            flexShrink: 0,
                            marginTop: layout.offsets[index]! - previousEnd,
                            paddingBottom: 8,
                            paddingLeft: Math.min(row.depth, 8) * 24,
                        }}
                    >
                        <TreeRow
                            row={row}
                            tree={tree}
                            listPublicId={pager.publicId}
                            substractArtists={substractArtists}
                        />
                    </div>
                );
            })}
        </div>
    );
}
