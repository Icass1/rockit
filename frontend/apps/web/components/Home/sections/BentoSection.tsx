"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { isSongWithAlbum } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";
import PlayButton from "@/components/Home/PlayButton";

interface BentoSectionProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
}

// ─── Single Bento Card ──────────────────────────────────

function BentoCard({
    song,
    queue,
    size,
    positionClass,
}: {
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
    size: "lg" | "s";
    positionClass: string;
}): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const { hex } = parseDominantColor(song.dominantColor);
    const [imgLoaded, setImgLoaded] = useState(false);

    const isThisPlaying =
        $currentMedia?.publicId === song.publicId && $playing;

    function handlePlay(e: React.MouseEvent): void {
        e.stopPropagation();
        const playableSongs = queue.filter(isSongWithAlbum);
        if (playableSongs.length > 0) {
            rockIt.queueManager.setMedia(playableSongs, "bento");
            rockIt.queueManager.moveToMedia(song.publicId);
            rockIt.mediaPlayerManager.play();
        }
    }

    return (
        <div
            className={`bento-card group relative cursor-pointer overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02] ${positionClass}`}
            onClick={handlePlay}
        >
            {/* Album art background */}
            <Image
                src={song.imageUrl}
                alt=""
                fill
                sizes={size === "lg" ? "(max-width: 768px) 90vw, 40vw" : "(max-width: 768px) 60vw, 20vw"}
                className={`object-cover transition-opacity duration-500 group-hover:opacity-40 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                draggable={false}
                aria-hidden="true"
                onLoad={(): void => setImgLoaded(true)}
            />

            {/* Gradient overlay for readability */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.55) 100%)",
                }}
                aria-hidden="true"
            />

            {/* Color tint — very subtle */}
            <div
                className="absolute inset-0 mix-blend-color transition-colors duration-700"
                style={{
                    backgroundColor: hex,
                    opacity: 0.08,
                }}
                aria-hidden="true"
            />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-3">
                <div className="min-w-0 flex-1">
                    <span
                        className={`block truncate font-bold text-white ${
                            size === "lg" ? "text-[17px]" : "text-[13px]"
                        }`}
                    >
                        {song.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-white/60">
                        {song.artists[0]?.name}
                    </span>
                </div>

                {/* Play button — always visible on lg card, on hover for small */}
                <div
                    className={`ml-2 flex-shrink-0 ${
                        size === "lg"
                            ? "opacity-100"
                            : "opacity-0 transition-opacity group-hover:opacity-100"
                    }`}
                >
                    <PlayButton
                        isPlaying={!!isThisPlaying}
                        onClick={handlePlay}
                        size={size === "lg" ? 40 : 32}
                        label={
                            isThisPlaying
                                ? `Pausar ${song.name}`
                                : `Reproducir ${song.name}`
                        }
                    />
                </div>
            </div>

            {/* Playing indicator on small cards */}
            {size === "s" && isThisPlaying && (
                <div className="absolute top-2 right-2 z-10">
                    <span className="cf-eq" aria-hidden="true" />
                </div>
            )}
        </div>
    );
}

// ─── Section Reveal (IntersectionObserver) ──────────────

function useRevealOnce(
    ref: React.RefObject<HTMLElement | null>,
    reducedMotion: boolean
): boolean {
    const [revealed, setRevealed] = useState(reducedMotion);

    useEffect(() => {
        const el = ref.current;
        if (!el || reducedMotion) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setRevealed(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, reducedMotion]);

    return revealed;
}

function getInitialReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ─── Main Component ─────────────────────────────────────

export default function BentoSection({
    title,
    songs,
}: BentoSectionProps): JSX.Element | null {
    const sectionRef = useRef<HTMLElement>(null);
    const [reducedMotion, setReducedMotion] = useState(getInitialReducedMotion);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = (e: MediaQueryListEvent): void =>
            setReducedMotion(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const revealed = useRevealOnce(sectionRef, reducedMotion);

    // Ambient tint from the first (featured) song
    const { hex: tintHex } = parseDominantColor(songs[0]?.dominantColor);

    const visibleSongs = useMemo(() => songs.slice(0, 5), [songs]);

    if (songs.length === 0) return null;

    return (
        <section
            ref={sectionRef}
            className="bento-section relative overflow-hidden px-[6%] pt-8 pb-2 md:px-[4%] md:pt-10"
            style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(16px)",
                transition: reducedMotion
                    ? "none"
                    : "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
        >
            {/* Ambient tint — subtle gradient wash from the featured song's dominant color */}
            <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
                style={{
                    background: `linear-gradient(180deg, ${tintHex} 0%, transparent 70%)`,
                    opacity: 0.08,
                }}
                aria-hidden="true"
            />

            <h2 className="relative z-10 mb-3.5 text-[clamp(18px,2.2cqw,26px)] font-extrabold text-white">
                {title}
            </h2>

            <div className="bento-grid relative z-10">
                {/* Large featured card */}
                <BentoCard
                    song={visibleSongs[0]}
                    queue={songs}
                    size="lg"
                    positionClass="bento-lg"
                />

                {/* Small cards — fill remaining grid slots */}
                {visibleSongs.slice(1, 5).map((song, i) => (
                    <BentoCard
                        key={song.publicId}
                        song={song}
                        queue={songs}
                        size="s"
                        positionClass={`bento-s${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
