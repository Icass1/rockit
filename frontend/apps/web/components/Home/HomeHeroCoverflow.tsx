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
import { useStore } from "@nanostores/react";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";
import { useHomeSubtitle } from "@/components/Home/hooks/useHomeSubtitle";
import PlayButton from "@/components/Home/PlayButton";

// ─── Types ──────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────

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
    const cardSize = Math.min(380, Math.max(200, width * 0.20));
    let maxVisible: number;
    if (width < 640) maxVisible = 1;
    else if (width < 1024) maxVisible = 2;
    else if (width < 1600) maxVisible = 2;
    else maxVisible = 3;
    const spacing = cardSize * 0.62;
    return { maxVisible, spacing, cardSize };
}

// ─── Card ───────────────────────────────────────────────

function CoverflowCardComponent({
    card,
    delta,
}: {
    card: CoverflowCard;
    delta: number;
}): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const isCenter = delta === 0;
    const [imgLoaded, setImgLoaded] = useState(false);
    const isThisPlaying =
        isCenter &&
        $currentMedia?.publicId === card.song.publicId &&
        $playing;

    function handlePlay(e: React.MouseEvent): void {
        e.stopPropagation();
        const playableSongs = card.queue.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "home");
            rockIt.queueManager.moveToMedia(card.song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }

    return (
        <>
            {/* Album art background — full card */}
            <Image
                src={card.song.imageUrl}
                alt=""
                fill
                sizes="250px"
                className={`object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                draggable={false}
                aria-hidden="true"
                onLoad={(): void => setImgLoaded(true)}
            />

            {/* Dark gradient overlay — dark at bottom for text readability */}
            <div
                className="absolute inset-0 rounded-[18px]"
                style={{
                    background:
                        "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
                }}
                aria-hidden="true"
            />

            {/* Content — visible only on center card */}
            {isCenter && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-4">
                    <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">
                            {card.eyebrow}
                        </span>
                        <span className="mt-0.5 block max-w-40 truncate text-sm font-bold text-white">
                            {card.song.name}
                        </span>
                        <span className="mt-0.5 block max-w-35 truncate text-xs text-white/55">
                            {card.song.artists[0]?.name}
                        </span>
                    </div>

                    <PlayButton
                        isPlaying={!!isThisPlaying}
                        onClick={handlePlay}
                        size={42}
                        label={
                            isThisPlaying
                                ? $vocabulary.PAUSE_SONG_NAME.replace("{name}", card.song.name)
                                : $vocabulary.PLAY_SONG_NAME.replace("{name}", card.song.name)
                        }
                    />
                </div>
            )}

            {/* Equalizer bars — only on center when playing */}
            {isCenter && isThisPlaying && (
                <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center">
                    <span className="cf-eq" aria-hidden="true" />
                </div>
            )}
        </>
    );
}

// ─── Main Component ─────────────────────────────────────

function getInitialReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HomeHeroCoverflow({
    greetingName,
    streak,
    minutesThisWeek,
    cards,
    onColorChange,
}: HomeHeroCoverflowProps): JSX.Element | null {
    const n = cards.length;

    const [center, setCenter] = useState(0);
    const [stageWidth, setStageWidth] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(getInitialReducedMotion);
    const stageRef = useRef<HTMLDivElement>(null);
    const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Early-return-safe derived values
    const currentCard = cards.length > 0 ? cards[center] : null;
    const { hex: dominantColor } = parseDominantColor(currentCard?.song.dominantColor);

    useEffect(() => {
        onColorChange?.(dominantColor);
    }, [dominantColor, onColorChange]);

    // ── reduced-motion listener ──
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = (e: MediaQueryListEvent): void => setReducedMotion(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // ── layout config ──
    const config = useMemo(() => getConfig(stageWidth), [stageWidth]);

    // ── IntersectionObserver: pause auto-advance off-screen ──
    const startAuto = useCallback((): void => {
        if (reducedMotion) return;
        if (autoTimerRef.current) return;
        autoTimerRef.current = setInterval(() => {
            setCenter((prev) => (prev + 1) % n);
        }, 3200);
    }, [reducedMotion, n]);

    const stopAuto = useCallback((): void => {
        if (autoTimerRef.current) {
            clearInterval(autoTimerRef.current);
            autoTimerRef.current = null;
        }
    }, []);

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

    // ── ResizeObserver on stage container ──
    useEffect(() => {
        const el = stageRef.current?.parentElement;
        if (!el) return;

        const ro = new ResizeObserver(([entry]) => {
            if (entry) setStageWidth(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ── Pointer drag (mouse + touch) ──
    const dragStartRef = useRef<number | null>(null);
    const dragMovedRef = useRef(false);

    const handlePointerDown = useCallback((e: React.PointerEvent): void => {
        dragStartRef.current = e.clientX;
        dragMovedRef.current = false;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
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

            if (!dragMovedRef.current) return;

            const step =
                delta < 0 ? 1 : -1;
            setCenter((prev) => {
                const next = prev + step;
                if (next < 0) return n - 1;
                if (next >= n) return 0;
                return next;
            });
        },
        [n]
    );

    // ── Keyboard ──
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent): void => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setCenter((prev) => (prev - 1 + n) % n);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setCenter((prev) => (prev + 1) % n);
            }
        },
        [n]
    );

    const subtitle = useHomeSubtitle({
        cards,
        centerIndex: center,
        streak,
        minutesThisWeek,
    });
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    // Early return after all hooks
    if (cards.length === 0) return null;

    // ── Card transform ──
    function getCardStyle(delta: number): React.CSSProperties {
        const ad = Math.abs(delta);
        const visible = ad <= config.maxVisible;
        const x = delta * config.spacing;
        const rot = Math.max(-38, Math.min(38, -delta * 34));
        const z = -ad * 90;
        const scale =
            ad === 0
                ? 1
                : Math.max(0.4, 1 - Math.min(ad, 3) * 0.2);
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

    // ── Stage height responsive ──
    const stageHeight = Math.round(config.cardSize * 1.25);

    return (
        <section className="cf-section relative">
            <div className="relative z-10 px-[6%] pt-7 pb-0">
                <h1 className="text-[clamp(20px,3.4cqw,40px)] font-extrabold leading-tight text-white">
                    {greetingName}
                </h1>
                {subtitle && (
                    <p className="mt-1.5 text-[13px] text-white/50">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Stage */}
            <div
                ref={stageRef}
                className="cf-stage relative mx-auto flex items-center justify-center touch-pan-y select-none"
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
                                className="cf-card absolute left-1/2 top-1/2"
                                style={getCardStyle(delta)}
                                onClick={(): void => {
                                    if (dragMovedRef.current) return;
                                    if (delta !== 0) {
                                        setCenter(i);
                                    }
                                }}
                            >
                                <CoverflowCardComponent
                                    card={card}
                                    delta={delta}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dots */}
            <nav className="relative z-10 flex justify-center gap-1.75 pb-5" aria-label={$vocabulary.CAROUSEL_NAVIGATION}>
                {cards.map((card, i) => (
                    <button
                        key={card.song.publicId}
                        type="button"
                        className={`cf-dot ${i === center ? "active" : ""}`}
                        aria-label={`${card.song.name} — ${card.eyebrow}`}
                        aria-current={i === center ? "true" : undefined}
                        onClick={(): void => setCenter(i)}
                    />
                ))}
            </nav>

            {/* sr-only list for accessibility */}
            <nav className="sr-only" aria-label={$vocabulary.FEATURED_SONGS}>
                <ul>
                    {cards.map((card, i) => (
                        <li key={card.song.publicId}>
                            <button
                                type="button"
                                onClick={(): void => setCenter(i)}
                            >
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
