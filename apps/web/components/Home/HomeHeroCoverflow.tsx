"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type JSX,
} from "react";
import Image from "next/image";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import useMedia from "@/hooks/useMedia";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { rockIt } from "@/lib/rockit/rockIt";
import { useCoverflow } from "@/components/Home/hooks/useCoverflow";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";
import { useHomeSubtitle } from "@/components/Home/hooks/useHomeSubtitle";
import PlayButton from "@/components/Home/PlayButton";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

// Types

export interface CoverflowCard {
    eyebrow: string;
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
}

interface HomeHeroCoverflowProps {
    greetingName: string;
    streak?: number;
    minutesThisWeek?: number;
    cards: CoverflowCard[];
    onColorChange?: (hex: string) => void;
}

// Helpers

function shortestDelta(i: number, c: number, n: number): number {
    let d = i - c;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
}

function getConfig(width: number): {
    maxVisible: number;
    spacing: number;
    cardSize: number;
} {
    const cardSize = Math.min(380, Math.max(200, width * 0.2));
    let maxVisible: number;
    if (width < 640) maxVisible = 1;
    else if (width < 1024) maxVisible = 2;
    else if (width < 1600) maxVisible = 2;
    else maxVisible = 3;
    const spacing = cardSize * 0.62;
    return { maxVisible, spacing, cardSize };
}

// Card

function CoverflowCardComponent({
    card,
    delta,
    cardSize,
    onMenuOpenChange,
}: {
    card: CoverflowCard;
    delta: number;
    cardSize: number;
    onMenuOpenChange: (open: boolean) => void;
}): JSX.Element {
    const song = useMedia(card.song);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $vocabulary = useVocabulary();
    const isCenter = delta === 0;
    const isThisPlaying =
        isCenter && $currentMedia?.publicId === song.publicId && $playing;

    function handlePlay(e: React.MouseEvent): void {
        e.stopPropagation();
        void rockIt.queueManager.playRecommendedSongAsync(song, card.queue);
    }

    return (
        <MediaContextMenu
            media={song}
            location={EMediaContextLocation.HOME}
            onPlay={() =>
                rockIt.queueManager.playRecommendedSongAsync(song, card.queue)
            }
            triggerClassName="h-full w-full"
            onOpenChange={onMenuOpenChange}
        >
            {/* Album art background — full card */}
            <Image
                src={song.imageUrl}
                alt=""
                fill
                sizes={`${Math.ceil(cardSize)}px`}
                className={`object-cover opacity-100 transition-opacity duration-500`}
                draggable={false}
                aria-hidden="true"
            />

            {/* Dark gradient overlay — dark at bottom for text readability */}
            <div
                className="absolute inset-0 rounded-[18px]"
                style={{
                    background:
                        "linear-gradient(to top, color-mix(in srgb, var(--theme-backdrop) 70%, transparent) 0%, color-mix(in srgb, var(--theme-backdrop) 30%, transparent) 40%, transparent 70%)",
                }}
                aria-hidden="true"
            />

            {/* Content — visible only on center card */}
            {isCenter && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-4">
                    <div className="min-w-0 flex-1">
                        <span className="text-on-media/60 block text-[10px] font-semibold tracking-wider uppercase">
                            {card.eyebrow}
                        </span>
                        <span className="text-on-media mt-0.5 block max-w-40 truncate text-sm font-bold">
                            {song.name}
                        </span>
                        <span className="text-on-media/55 mt-0.5 block max-w-35 truncate text-xs">
                            {song.artists[0]?.name}
                        </span>
                    </div>

                    <PlayButton
                        isPlaying={!!isThisPlaying}
                        download={!song.downloaded}
                        onClick={handlePlay}
                        size={42}
                        label={
                            !song.downloaded
                                ? $vocabulary.CLICK_TO_DOWNLOAD
                                : isThisPlaying
                                  ? $vocabulary.PAUSE_SONG_NAME.replace(
                                        "{name}",
                                        song.name
                                    )
                                  : $vocabulary.PLAY_SONG_NAME.replace(
                                        "{name}",
                                        song.name
                                    )
                        }
                    />
                </div>
            )}
        </MediaContextMenu>
    );
}

// Main Component

export default function HomeHeroCoverflow({
    greetingName,
    streak,
    minutesThisWeek,
    cards,
    onColorChange,
}: HomeHeroCoverflowProps): JSX.Element | null {
    const n = cards.length;

    const [menuOpen, setMenuOpen] = useState(false);
    const [stageWidth, setStageWidth] = useState(0);
    const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const stageRef = useRef<HTMLDivElement>(null);

    const { center, next, prev, goTo, startAuto, stopAuto } = useCoverflow({
        length: n,
        reducedMotion: reducedMotion || menuOpen,
    });

    // Early-return-safe derived values
    const currentCard = cards.length > 0 ? cards[center] : null;
    const { hex: dominantColor } = parseDominantColor(
        currentCard?.song.dominantColor
    );

    useEffect(() => {
        onColorChange?.(dominantColor);
    }, [dominantColor, onColorChange]);

    // reduced-motion listener
    const config = useMemo(() => getConfig(stageWidth), [stageWidth]);

    // IntersectionObserver: pause auto-advance off-screen
    useEffect(() => {
        const sentinel = stageRef.current?.parentElement;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    startAuto();
                } else {
                    stopAuto();
                }
            },
            { threshold: 0 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [startAuto, stopAuto]);

    // ResizeObserver on stage container
    useEffect(() => {
        const el = stageRef.current?.parentElement;
        if (!el) return;

        const ro = new ResizeObserver(([entry]) => {
            if (entry) setStageWidth(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Pointer drag (mouse + touch)
    const dragStartRef = useRef<number | null>(null);
    const dragMovedRef = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent): void => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button"))
            return;
        dragStartRef.current = e.clientX;
        dragMovedRef.current = false;
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent): void => {
        if (dragStartRef.current === null) return;
        const delta = e.clientX - dragStartRef.current;
        if (Math.abs(delta) > 12) dragMovedRef.current = true;
    }, []);

    const handlePointerUp = useCallback(
        (e: React.PointerEvent): void => {
            if (dragStartRef.current === null) return;
            const delta = e.clientX - dragStartRef.current;
            dragStartRef.current = null;
            if (menuOpen) return;

            if (dragMovedRef.current) {
                if (delta < 0) next();
                else prev();
                return;
            }

            const stageEl = stageRef.current;
            if (!stageEl) return;
            const rect = stageEl.getBoundingClientRect();
            const offsetFromCenter = e.clientX - (rect.left + rect.width / 2);
            const closestDelta = Math.round(offsetFromCenter / config.spacing);
            const idx = (((center + closestDelta) % n) + n) % n;
            if (idx !== center) goTo(idx);
        },
        [center, n, config.spacing, next, prev, goTo, menuOpen]
    );

    // Keyboard
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent): void => {
            if (e.target !== e.currentTarget || menuOpen) return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                prev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
            }
        },
        [next, prev, menuOpen]
    );

    const subtitle = useHomeSubtitle({
        cards,
        centerIndex: center,
        streak,
        minutesThisWeek,
    });
    const $vocabulary = useVocabulary();

    // Early return after all hooks
    if (cards.length === 0) return null;

    // Card transform
    function getCardStyle(delta: number): React.CSSProperties {
        const ad = Math.abs(delta);
        const visible = ad <= config.maxVisible;
        const x =
            Math.abs(delta) ** (1 / 1.5) * config.spacing * Math.sign(delta);
        const rot = Math.max(-38, Math.min(38, -delta * 34));
        const z = -ad * 90;
        const scale = ad === 0 ? 1 : Math.max(0.4, 1 - Math.min(ad, 3) * 0.2);
        const opacity = visible
            ? Math.max(0, 1 - ad * (1 / (config.maxVisible + 0.6)))
            : 0;
        const duration = reducedMotion ? "0s" : "0.6s";
        return {
            width: config.cardSize,
            height: config.cardSize,
            transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rot}deg) scale(${scale})`,
            opacity,
            zIndex: 100 - ad,
            pointerEvents: visible ? "auto" : "none",
            transition: `transform ${duration} cubic-bezier(0.22,0.9,0.24,1), opacity ${duration} ease`,
        };
    }

    // Stage height responsive
    const stageHeight = Math.round(config.cardSize * 1.25);

    return (
        <section className="cf-section relative">
            <div className="relative z-10 px-[6%] pt-7 pb-0">
                <h1 className="text-foreground text-[clamp(20px,3.4cqw,40px)] leading-tight font-bold">
                    {greetingName}
                </h1>
                {subtitle && (
                    <p className="text-foreground/50 mt-1.5 text-[13px]">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Stage */}
            <div
                ref={stageRef}
                className="cf-stage relative mx-auto flex touch-pan-y items-center justify-center select-none"
                style={{ height: stageHeight }}
                tabIndex={0}
                role="group"
                aria-roledescription="coverflow"
                aria-label={$vocabulary.HOME_HIGHLIGHTS}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="cf-track relative h-full w-full">
                    {cards.map((card, i) => {
                        const delta = shortestDelta(i, center, n);
                        return (
                            <div
                                key={card.song.publicId}
                                className="cf-card absolute top-1/2 left-1/2"
                                style={getCardStyle(delta)}
                            >
                                <CoverflowCardComponent
                                    card={card}
                                    delta={delta}
                                    cardSize={config.cardSize}
                                    onMenuOpenChange={setMenuOpen}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dots */}
            <nav
                className="relative z-10 flex justify-center gap-1.75 pb-5"
                aria-label={$vocabulary.CAROUSEL_NAVIGATION}
            >
                {cards.map((card, i) => (
                    <button
                        key={card.song.publicId}
                        type="button"
                        className={`cf-dot ${i === center ? "active" : ""}`}
                        aria-label={`${card.song.name} — ${card.eyebrow}`}
                        aria-current={i === center ? "true" : undefined}
                        onClick={(): void => goTo(i)}
                    />
                ))}
            </nav>

            {/* sr-only list for accessibility */}
            <nav className="sr-only" aria-label={$vocabulary.FEATURED_SONGS}>
                <ul>
                    {cards.map((card, i) => (
                        <li key={card.song.publicId}>
                            <button type="button" onClick={(): void => goTo(i)}>
                                {card.song.name} — {card.eyebrow}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* aria-live for center card announcement */}
            <div aria-live="polite" className="sr-only">
                {currentCard?.song.name}
            </div>
        </section>
    );
}
