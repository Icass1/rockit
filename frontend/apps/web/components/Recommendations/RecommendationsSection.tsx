"use client";

import { useCallback, type JSX } from "react";
import Image from "next/image";
import type { BaseSearchResultsItem, BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { isDownloadable, isQueueable } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

/** Queue identifier used when playing straight from a recommendation card
 * (BentoSection uses "bento" the same way). */
const RECOMMENDATIONS_QUEUE_ID = "recommendations";

/** A song already in this Rockit instance. Behaves exactly like a row in a
 * playlist: click downloads it when missing, otherwise plays it; right-click
 * opens the standard media menu (add to playlist, queue, library…). */
function KnownSongCard({
    song: _song,
    queue,
}: {
    song: BaseSongWithAlbumResponse;
    queue: BaseSongWithAlbumResponse[];
}): JSX.Element {
    const $song = useMedia(_song);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const downloaded = !isDownloadable($song) || $song.downloaded === true;

    const handleClick = useCallback((): void => {
        if (!downloaded) {
            rockIt.downloaderManager.downloadMediaAsync(
                [$song.publicId],
                $song.name
            );
            return;
        }

        rockIt.queueManager.setMedia(
            queue.filter(isQueueable),
            RECOMMENDATIONS_QUEUE_ID
        );
        rockIt.queueManager.moveToMedia($song.publicId);
        rockIt.mediaPlayerManager.play();
    }, [$song, queue, downloaded]);

    return (
        <MediaContextMenu media={$song} location={EMediaContextLocation.HOME}>
            <RecommendationCard
                name={$song.name}
                imageUrl={$song.imageUrl}
                artistNames={$song.artists.map((a): string => a.name)}
                dimmed={!downloaded}
                hint={!downloaded ? $vocabulary.CLICK_TO_DOWNLOAD : undefined}
                onClick={handleClick}
            />
        </MediaContextMenu>
    );
}

/** A song this instance does not have yet, surfaced from Last.fm and resolved
 * through Rockit's own provider search. Left-click opens the same menu search
 * results use (download to server, add to playlist and download…). */
function DiscoverCard({ item }: { item: BaseSearchResultsItem }): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <MediaContextMenu media={item} location={EMediaContextLocation.SEARCH}>
            <RecommendationCard
                name={item.name}
                imageUrl={item.imageUrl}
                artistNames={item.artists.map((a): string => a.name)}
                dimmed
                hint={$vocabulary.CLICK_TO_DOWNLOAD}
            />
        </MediaContextMenu>
    );
}

function RecommendationCard({
    name,
    imageUrl,
    artistNames,
    dimmed,
    hint,
    onClick,
}: {
    name: string;
    imageUrl: string;
    artistNames: string[];
    dimmed: boolean;
    hint?: string;
    onClick?: () => void;
}): JSX.Element {
    return (
        <div
            className={`group relative w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105 ${dimmed ? "opacity-50" : ""}`}
            onClick={onClick}
        >
            <Image
                width={350}
                height={350}
                className="aspect-square w-full rounded-lg object-cover select-none"
                src={imageUrl}
                alt={`Cover of ${name}`}
            />
            {hint && (
                <p className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-md border border-white bg-black px-2 py-1 text-center text-sm font-semibold text-white group-hover:block">
                    {hint}
                </p>
            )}
            <span className="mt-2 block truncate text-center font-semibold">
                {name}
            </span>
            <span className="block truncate text-center text-sm text-gray-400">
                {artistNames.join(", ")}
            </span>
        </div>
    );
}

/** Horizontal carousel of recommended songs, mirroring how search results are
 * presented so every card offers the same actions. Rendering is decoupled from
 * how the backend picks the songs — swapping the algorithm never touches this. */
export default function RecommendationsSection({
    title,
    songs,
    discover = [],
}: {
    title: string;
    songs: BaseSongWithAlbumResponse[];
    discover?: BaseSearchResultsItem[];
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (songs.length === 0 && discover.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {title}
            </h2>
            {songs.length > 0 && (
                <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                    {songs.map(
                        (song): JSX.Element => (
                            <KnownSongCard
                                key={song.publicId}
                                song={song}
                                queue={songs}
                            />
                        )
                    )}
                </div>
            )}
            {discover.length > 0 && (
                <>
                    <h3 className="px-5 text-left text-lg font-semibold text-neutral-400 md:px-0">
                        {$vocabulary.PLAYER_DISCOVER_TITLE}
                    </h3>
                    <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                        {discover.map(
                            (item): JSX.Element => (
                                <DiscoverCard
                                    key={item.providerUrl}
                                    item={item}
                                />
                            )
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
