"use client";

import { useMemo, type JSX } from "react";
import Image from "next/image";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";
import PlayButton from "@/components/Home/PlayButton";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface BentoSectionProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
}

// ─── Single Bento Card ──────────────────────────────────

function BentoCard({
    song: initialSong,
    queue,
    size,
    positionClass,
}: {
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
    size: "lg" | "s";
    positionClass: string;
}): JSX.Element {
    const song = useMedia(initialSong);
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const $vocabulary = useVocabulary();
    const { hex } = parseDominantColor(song.dominantColor);

    const isThisPlaying = $currentMedia?.publicId === song.publicId && $playing;

    function handlePlay(e: React.MouseEvent): void {
        e.stopPropagation();
        void rockIt.queueManager.playRecommendedSongAsync(song, queue);
    }

    return (
        <MediaContextMenu
            media={song}
            location={EMediaContextLocation.HOME}
            triggerClassName={positionClass}
        >
            <div
                className={`bento-card group relative h-full w-full cursor-pointer overflow-hidden rounded-2xl transition-transform duration-300 hover:scale-[1.02]`}
                onClick={handlePlay}
            >
                {/* Album art background */}
                <Image
                    src={song.imageUrl}
                    alt=""
                    fill
                    sizes={
                        size === "lg"
                            ? "(max-width: 768px) 90vw, 40vw"
                            : "(max-width: 768px) 60vw, 20vw"
                    }
                    className={`object-cover opacity-100 transition-opacity duration-500 group-hover:opacity-40`}
                    loading="lazy"
                    draggable={false}
                    aria-hidden="true"
                />

                {/* Gradient overlay for readability */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(180deg, transparent 40%, color-mix(in srgb, var(--theme-backdrop) 55%, transparent) 100%)",
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
                            className={`text-on-media block truncate font-bold ${
                                size === "lg" ? "text-[17px]" : "text-[13px]"
                            }`}
                        >
                            {song.name}
                        </span>
                        <span className="text-on-media/60 mt-0.5 block truncate text-xs">
                            {song.artists[0]?.name}
                        </span>
                    </div>

                    {/* Play button — always visible on lg card, on hover for small */}
                    <div
                        className={`ml-2 shrink-0 ${
                            size === "lg"
                                ? "opacity-100"
                                : "opacity-0 transition-opacity group-hover:opacity-100"
                        }`}
                    >
                        <PlayButton
                            isPlaying={!!isThisPlaying}
                            download={!song.downloaded}
                            onClick={handlePlay}
                            size={size === "lg" ? 40 : 32}
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
                </div>
            </div>
        </MediaContextMenu>
    );
}

// ─── Section Reveal (IntersectionObserver) ──────────────

export default function BentoSection({
    title,
    songs,
}: BentoSectionProps): JSX.Element | null {
    // Ambient tint from the first (featured) song
    const { hex: tintHex } = parseDominantColor(songs[0]?.dominantColor);

    const visibleSongs = useMemo(() => songs.slice(0, 5), [songs]);

    if (songs.length === 0) return null;

    return (
        <section className="bento-section relative overflow-hidden px-[6%] pt-8 pb-2 md:px-[4%] md:pt-10">
            {/* Ambient tint — subtle gradient wash, fades in to avoid hard edges between sections */}
            <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
                style={{
                    background: `linear-gradient(180deg, transparent 0%, transparent 15%, ${tintHex} 50%, transparent 100%)`,
                    opacity: 0.15,
                }}
                aria-hidden="true"
            />

            <h2 className="text-on-media relative z-10 mb-3.5 text-[clamp(18px,2.2cqw,26px)] font-extrabold">
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
