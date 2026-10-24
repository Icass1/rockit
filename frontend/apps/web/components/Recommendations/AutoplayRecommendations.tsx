"use client";

import { useEffect, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ERepeatMode, getMediaArtistsString } from "@rockit/shared";
import { Download, ListPlus } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

/** Shared by the desktop player and the compact PWA player. */
export default function AutoplayRecommendations(): JSX.Element {
    const items = useStore(rockIt.queueManager.autoplayRecommendationsAtom);
    const current = useStore(rockIt.queueManager.currentMediaAtom);
    const repeat = useStore(rockIt.userManager.repeatModeAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const loading = useStore(rockIt.queueManager.autoplayLoadingAtom);

    useEffect(() => {
        void rockIt.queueManager.loadAutoplaySuggestionsAsync();
    }, [current?.publicId]);

    return (
        <section
            className="mt-4 border-t border-white/10 pt-4"
            aria-busy={loading}
        >
            <h3 className="px-4 pb-3 text-sm font-semibold text-(--color-muted)">
                {repeat === ERepeatMode.OFF
                    ? vocabulary.AUTOPLAY_ON
                    : vocabulary.RECOMMENDED_SONGS}
            </h3>
            {loading &&
                items.length === 0 &&
                [0, 1, 2].map((index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 px-4 py-2"
                        aria-hidden="true"
                    >
                        <div className="skeleton h-12 w-12 shrink-0 rounded" />
                        <div className="flex-1">
                            <div className="skeleton mb-2 h-4 w-2/3 rounded" />
                            <div className="skeleton h-3 w-1/3 rounded" />
                        </div>
                    </div>
                ))}
            {!loading && items.length === 0 && (
                <p className="px-4 py-2 text-sm text-(--color-muted)">
                    {vocabulary.NO_SIMILAR_SONGS_FOUND}
                </p>
            )}
            {items.map((entry) => {
                const media = entry.kind === "song" ? entry.song : entry.item;
                const ready = media.downloaded === true;
                return (
                    <button
                        key={
                            entry.kind === "song"
                                ? entry.song.publicId
                                : `${media.artists[0]?.name}:${media.name}`
                        }
                        type="button"
                        onClick={() => {
                            void rockIt.queueManager.playAutoplayRecommendationAsync(
                                entry
                            );
                        }}
                        className="flex min-h-16 w-full items-center gap-3 rounded px-4 py-2 text-left transition hover:bg-(--color-surface) focus-visible:outline-2 focus-visible:outline-(--color-rockit-pink)"
                        title={
                            ready
                                ? vocabulary.PLAY_NEXT
                                : vocabulary.CLICK_TO_DOWNLOAD
                        }
                    >
                        <Image
                            src={
                                media.imageUrl ||
                                rockIt.SONG_PLACEHOLDER_IMAGE_URL
                            }
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded object-cover"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                                {media.name}
                            </span>
                            <span className="block truncate text-xs text-(--color-muted)">
                                {getMediaArtistsString(media) ||
                                    vocabulary.UNKNOWN}
                            </span>
                        </span>
                        {ready ? (
                            <ListPlus
                                className="h-4 w-4 shrink-0 text-(--color-rockit-pink)"
                                aria-hidden="true"
                            />
                        ) : (
                            <Download
                                className="h-4 w-4 shrink-0 text-(--color-muted)"
                                aria-label={vocabulary.CLICK_TO_DOWNLOAD}
                            />
                        )}
                    </button>
                );
            })}
        </section>
    );
}
