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
        return <CollectionControls pager={row.pager} />;
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
            const top = Math.max(0, parentBounds?.top ?? 0);
            const bottom = Math.min(
                window.innerHeight,
                parentBounds?.bottom ?? window.innerHeight
            );
            const next = {
                offset: Math.max(0, top - bounds.top),
                height: Math.max(0, bottom - Math.max(top, bounds.top)),
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
        const observer = new ResizeObserver(update);
        observer.observe(element);
        if (parent) observer.observe(parent);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
            observer.disconnect();
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
    useEffect(() => {
        if (!root.current) return;
        const observer = new ResizeObserver((entries) => {
            setHeights((previous) => {
                let next = previous;
                if (previous.size > rows.length * 2 + 1000) {
                    const keys = new Set(rows.map((row) => row.key));
                    next = new Map(
                        [...previous].filter(([key]) => keys.has(key))
                    );
                }
                for (const entry of entries) {
                    const key = (entry.target as HTMLElement).dataset.rowKey;
                    const height = entry.target.getBoundingClientRect().height;
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
        });
        for (const element of root.current.querySelectorAll<HTMLElement>(
            "[data-row-key]"
        ))
            observer.observe(element);
        return () => observer.disconnect();
    }, [rows, range.start, range.end, focused]);
    useEffect(() => {
        if (!root.current) return;
        let width = root.current.getBoundingClientRect().width;
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
            style={{
                height: layout.total,
                position: "relative",
                overflowAnchor: "none",
            }}
        >
            {visible.map((row) => {
                const index = layout.indices.get(row.key)!;
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
                            position: "absolute",
                            top: layout.offsets[index],
                            left: 0,
                            right: 0,
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
