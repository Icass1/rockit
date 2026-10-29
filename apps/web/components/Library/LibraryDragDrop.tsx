"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type JSX,
    type MouseEventHandler,
    type PointerEvent,
    type ReactNode,
} from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import type { TMediaWithSearch } from "@rockit/shared";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import type {
    LibraryDragDropState,
    LibraryDragMedia,
} from "@/models/interfaces/libraryDragDrop";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    dragScrollSpeed,
    dragThresholdReached,
    isLibraryDragSource,
} from "@/lib/utils/libraryDragDrop";
import { useLibrarySelection } from "@/components/Library/LibrarySelectionContext";

const DragContext = createContext<LibraryDragDropState | undefined>(undefined);

export function LibraryDragDropProvider({
    enabled,
    children,
}: {
    enabled: boolean;
    children: ReactNode;
}): JSX.Element {
    const { selectionMode } = useLibrarySelection();
    const playlists = useStore(rockIt.playlistManager.playlistsAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const ownedIds = useMemo(
        () => new Set(playlists.map((item) => item.publicId)),
        [playlists]
    );
    const [previewStart, setPreviewStart] = useState({ x: 0, y: 0 });
    const [source, setSource] = useState<LibraryDragMedia | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);
    const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
        new Set()
    );
    const [successIds, setSuccessIds] = useState<ReadonlySet<string>>(
        new Set()
    );
    const pending = useRef(new Set<string>());
    const cleanup = useRef<(() => void) | null>(null);
    const suppressUntil = useRef(0);
    const ghost = useRef<HTMLDivElement>(null);
    const position = useRef({ x: 0, y: 0 });
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const mounted = useRef(true);
    const active = enabled && !selectionMode;

    useEffect(() => {
        mounted.current = true;
        const scheduled = timers.current;
        return (): void => {
            mounted.current = false;
            cleanup.current?.();
            for (const timer of scheduled) clearTimeout(timer);
        };
    }, []);
    useEffect(() => {
        if (!active) cleanup.current?.();
    }, [active]);

    const save = async (media: LibraryDragMedia, id: string): Promise<void> => {
        if (pending.current.has(id)) return;
        pending.current.add(id);
        setPendingIds(new Set(pending.current));
        try {
            const ok =
                await rockIt.playlistManager.addLibraryMediaToOwnedPlaylist(
                    media,
                    id
                );
            if (ok && mounted.current) {
                setSuccessIds((current) => new Set([...current, id]));
                const timer = setTimeout(() => {
                    timers.current.delete(timer);
                    if (mounted.current)
                        setSuccessIds((current) => {
                            const next = new Set(current);
                            next.delete(id);
                            return next;
                        });
                }, 900);
                timers.current.add(timer);
            }
        } finally {
            pending.current.delete(id);
            if (mounted.current) setPendingIds(new Set(pending.current));
        }
    };

    const start = (
        media: LibraryDragMedia,
        event: PointerEvent<HTMLDivElement>
    ): void => {
        if (
            !active ||
            cleanup.current ||
            event.button !== 0 ||
            event.pointerType !== "mouse"
        )
            return;
        if (
            (event.target as Element).closest(
                "button,input,textarea,select,[contenteditable=true],[role=checkbox],[role=button]:not([data-library-drag-handle]),[data-artist-link]"
            )
        )
            return;
        const element = event.currentTarget;
        const pointerId = event.pointerId;
        const initial = { x: event.clientX, y: event.clientY };
        position.current = initial;
        let dragging = false;
        let stopped = false;
        let frame = 0;
        let hovered: string | null = null;
        const controller = new AbortController();
        const options = { capture: true, signal: controller.signal };
        const scroll = document.getElementById("main-scroll-container");
        const scrollStyle = scroll ? getComputedStyle(scroll) : null;
        const topInset = parseFloat(scrollStyle?.paddingTop ?? "0") || 0;
        const bottomInset = parseFloat(scrollStyle?.paddingBottom ?? "0") || 0;
        const hit = (): string | null => {
            const node = document.elementFromPoint(
                position.current.x,
                position.current.y
            );
            const id = node?.closest<HTMLElement>("[data-library-drop-target]")
                ?.dataset.libraryDropTarget;
            return id &&
                !pending.current.has(id) &&
                rockIt.playlistManager.playlistsAtom
                    .get()
                    .some((playlist) => playlist.publicId === id)
                ? id
                : null;
        };
        const finish = (): void => {
            if (stopped) return;
            stopped = true;
            controller.abort();
            cancelAnimationFrame(frame);
            if (element.hasPointerCapture(pointerId))
                element.releasePointerCapture(pointerId);
            if (dragging) suppressUntil.current = performance.now() + 250;
            document.body.classList.remove("library-dnd-active");
            cleanup.current = null;
            if (mounted.current) {
                setSource(null);
                setTargetId(null);
            }
        };
        const tick = (): void => {
            if (stopped) return;
            if (ghost.current)
                ghost.current.style.transform = `translate3d(${Math.max(4, Math.min(window.innerWidth - 92, position.current.x + 14))}px,${Math.max(4, Math.min(window.innerHeight - 92, position.current.y + 14))}px,0)`;
            if (scroll) {
                const rect = scroll.getBoundingClientRect();
                if (
                    position.current.x >= rect.left &&
                    position.current.x <= rect.right
                ) {
                    scroll.scrollTop += dragScrollSpeed(
                        position.current.y,
                        Math.max(0, rect.top + topInset),
                        Math.min(window.innerHeight, rect.bottom) - bottomInset
                    );
                }
            }
            const next = hit();
            if (next !== hovered) {
                hovered = next;
                setTargetId(next);
            }
            frame = requestAnimationFrame(tick);
        };
        cleanup.current = finish;
        document.addEventListener(
            "pointermove",
            (move) => {
                if (move.pointerId !== pointerId) return;
                position.current = { x: move.clientX, y: move.clientY };
                if (
                    !dragging &&
                    dragThresholdReached(
                        initial.x,
                        initial.y,
                        move.clientX,
                        move.clientY
                    )
                ) {
                    dragging = true;
                    element.setPointerCapture(pointerId);
                    document.body.classList.add("library-dnd-active");
                    suppressUntil.current = Infinity;
                    setPreviewStart({ x: move.clientX, y: move.clientY });
                    setSource(media);
                    frame = requestAnimationFrame(tick);
                }
                if (dragging) move.preventDefault();
            },
            options
        );
        document.addEventListener(
            "pointerup",
            (up) => {
                if (up.pointerId !== pointerId) return;
                position.current = { x: up.clientX, y: up.clientY };
                const id = dragging ? hit() : null;
                if (dragging) up.preventDefault();
                finish();
                if (id) void save(media, id);
            },
            options
        );
        document.addEventListener(
            "pointercancel",
            (cancel) => {
                if (cancel.pointerId === pointerId) finish();
            },
            options
        );
        element.addEventListener("lostpointercapture", finish, {
            signal: controller.signal,
        });
        document.addEventListener(
            "keydown",
            (key) => {
                if (key.key === "Escape") {
                    key.preventDefault();
                    finish();
                }
            },
            options
        );
        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) finish();
            },
            { signal: controller.signal }
        );
        window.addEventListener("blur", finish, { signal: controller.signal });
        window.addEventListener("resize", finish, {
            signal: controller.signal,
        });
    };

    const target = playlists.find((playlist) => playlist.publicId === targetId);
    const announcement = source
        ? target
            ? vocabulary.LIBRARY_DROP_TARGET.replace("{playlist}", target.name)
            : vocabulary.LIBRARY_DRAGGING.replace("{media}", source.name)
        : "";
    return (
        <DragContext.Provider
            value={{
                enabled: active,
                source,
                targetId,
                ownedIds,
                pendingIds,
                successIds,
                start,
                suppressClick: () => performance.now() < suppressUntil.current,
            }}
        >
            {children}
            <span className="sr-only" role="status" aria-live="polite">
                {announcement}
            </span>
            {source &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={ghost}
                        aria-hidden="true"
                        className="library-drag-preview pointer-events-none fixed top-0 left-0 z-[1000] h-20 w-20"
                        style={{
                            transform: `translate3d(${previewStart.x + 14}px,${previewStart.y + 14}px,0)`,
                        }}
                    >
                        <Image
                            src={source.imageUrl || "/song-placeholder.png"}
                            alt=""
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-lg object-cover shadow-2xl"
                            draggable={false}
                        />
                        {targetId && (
                            <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-neutral-950 bg-emerald-600 text-white shadow-lg">
                                <Plus size={22} strokeWidth={3} />
                            </span>
                        )}
                    </div>,
                    document.body
                )}
        </DragContext.Provider>
    );
}

export function LibraryDragDropSurface({
    media,
    className,
    children,
    onClickCapture,
    layout = "card",
}: {
    media: TMediaWithSearch;
    className?: string;
    layout?: "card" | "row";
    children: ReactNode;
    onClickCapture?: MouseEventHandler<HTMLDivElement>;
}): JSX.Element {
    const context = useContext(DragContext);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const id = "publicId" in media ? media.publicId : null;
    const draggable = context?.enabled && isLibraryDragSource(media);
    const owned =
        context?.enabled &&
        media.type === "playlist" &&
        !!id &&
        context.ownedIds.has(id);
    const over = !!id && context?.targetId === id;
    const busy = !!id && context?.pendingIds.has(id);
    const success = !!id && context?.successIds.has(id);
    return (
        <div
            className={`library-dnd-surface ${draggable ? "library-dnd-source" : ""} ${className ?? ""}`}
            data-library-surface-layout={layout}
            data-library-drop-target={owned ? id : undefined}
            data-library-drop-denied={
                context?.enabled && media.type === "playlist" && !owned
                    ? "true"
                    : undefined
            }
            data-library-drop-state={
                busy
                    ? "pending"
                    : over
                      ? "active"
                      : success
                        ? "success"
                        : undefined
            }
            data-library-dragging={
                context?.source?.publicId === id ? "true" : undefined
            }
            aria-busy={busy || undefined}
            onPointerDownCapture={(event) => {
                if (draggable && isLibraryDragSource(media))
                    context?.start(media, event);
            }}
            onDragStartCapture={(event) => {
                if (draggable) event.preventDefault();
            }}
            onClickCapture={(event) => {
                if (context?.suppressClick()) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                onClickCapture?.(event);
            }}
            onContextMenuCapture={(event) => {
                if (context?.source) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
        >
            {children}
            {(over || busy || success) && (
                <span className="library-drop-indicator" aria-hidden="true">
                    {busy ? (
                        <LoaderCircle
                            size={20}
                            className="animate-spin motion-reduce:animate-none"
                        />
                    ) : success ? (
                        <Check size={20} />
                    ) : (
                        <Plus size={20} />
                    )}
                </span>
            )}
            {busy && (
                <span role="status" className="sr-only">
                    {vocabulary.LIBRARY_DROP_SAVING}
                </span>
            )}
        </div>
    );
}
