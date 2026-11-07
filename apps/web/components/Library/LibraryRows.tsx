"use client";

import { useMemo, type JSX, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { EMediaContextLocation } from "@rockit/shared";
import { MediaArtwork } from "@rockit/ui";
import { CircleCheck, SquareCheck, SquareDashed } from "lucide-react";
import type { TMediaWithSearch } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import { artistPageUrl } from "@/lib/services/artistService";
import Artists from "@/components/Artists/Artists";
import { LibraryDragDropSurface } from "@/components/Library/LibraryDragDrop";
import {
    isZippable,
    useLibrarySelection,
} from "@/components/Library/LibrarySelectionContext";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator/OfflineIndicator";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

function SelectableRow({
    media,
    children,
}: {
    media: TMediaWithSearch;
    children: ReactNode;
}): JSX.Element {
    const { selectionMode, isSelected, toggleSelection } =
        useLibrarySelection();

    // Stations and artists cannot be packaged into a ZIP, so they stay
    // clickable and show no checkbox while selecting.
    const selectable = selectionMode && isZippable(media);

    return (
        <LibraryDragDropSurface
            media={media}
            layout="row"
            className="relative"
            onClickCapture={(event): void => {
                if (
                    !selectable ||
                    (event.target instanceof Element &&
                        event.target.closest("[data-artist-link]"))
                )
                    return;
                event.preventDefault();
                event.stopPropagation();
                toggleSelection(media);
            }}
        >
            {children}
            {selectable && (
                <div className="bg-backdrop/60 pointer-events-none absolute top-1/2 right-4 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded">
                    {"publicId" in media &&
                    media.publicId !== null &&
                    isSelected(media.publicId) ? (
                        <SquareCheck className="text-primary h-5 w-5" />
                    ) : (
                        <SquareDashed className="text-foreground-strong/80 h-5 w-5" />
                    )}
                </div>
            )}
        </LibraryDragDropSurface>
    );
}

/* ------------------------------------------------------- */
/* GROUP BY FIRST ARTIST                                   */
/* ------------------------------------------------------- */

export function groupByArtist<T extends { artists?: { name: string }[] }>(
    items: T[]
): [string, T[]][] {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
        const key = item.artists?.[0]?.name ?? "Unknown Artist";
        (groups[key] ??= []).push(item);
    }
    return Object.entries(groups).sort(([a], [b]): number =>
        a.localeCompare(b)
    );
}

/* ------------------------------------------------------- */
/* SHARED PRIMITIVES                                       */
/* ------------------------------------------------------- */

/** Small square cover thumbnail used in every row. */
function SquareCover({
    src,
    alt,
    fallback = "/song-placeholder.png",
}: {
    src: string;
    alt: string;
    fallback?: string;
}): JSX.Element {
    return <MediaArtwork uri={src} fallbackUri={fallback} label={alt} />;
}

/** Wider 16:9 thumbnail for video rows. */
function VideoCover({ src, alt }: { src: string; alt: string }): JSX.Element {
    return (
        <div className="relative h-12 w-21.25 shrink-0 overflow-hidden rounded-md">
            <Image
                src={src}
                alt={alt}
                fill
                sizes="85px"
                className="object-cover select-none"
            />
        </div>
    );
}

/* ------------------------------------------------------- */
/* ROW COMPONENTS                                          */
/* ------------------------------------------------------- */

export function AlbumRow({
    album,
}: {
    album: BaseAlbumWithoutSongsResponse;
}): JSX.Element {
    return (
        <MediaContextMenu
            media={album}
            location={EMediaContextLocation.LIBRARY}
        >
            <SelectableRow media={album}>
                <div className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-2 transition-colors select-none">
                    <Link prefetch={false} href={album.url}>
                        <SquareCover
                            src={
                                album.imageUrl ??
                                rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                            }
                            alt={album.name}
                        />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <Link
                            prefetch={false}
                            href={album.url}
                            className="flex items-center gap-1.5"
                        >
                            <p className="text-foreground-strong truncate font-medium">
                                {album.name}
                            </p>
                            {album.undownloadedCount === 0 && (
                                <CircleCheck className="text-primary h-5 w-5 shrink-0" />
                            )}
                        </Link>
                        <Artists
                            artists={album.artists}
                            className="text-muted-foreground justify-start text-sm"
                        />
                    </div>
                </div>
            </SelectableRow>
        </MediaContextMenu>
    );
}

export function PlaylistRow({
    playlist,
}: {
    playlist: BasePlaylistWithoutMediasResponse;
}): JSX.Element {
    return (
        <MediaContextMenu
            media={playlist}
            location={EMediaContextLocation.LIBRARY}
        >
            <SelectableRow media={playlist}>
                <Link
                    prefetch={false}
                    href={playlist.url}
                    className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-2 transition-colors select-none [-webkit-touch-callout:none]"
                >
                    <SquareCover
                        src={
                            playlist.imageUrl ??
                            rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                        }
                        alt={playlist.name}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-foreground-strong truncate font-medium">
                            {playlist.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                            {playlist.owner.name}
                        </p>
                    </div>
                </Link>
            </SelectableRow>
        </MediaContextMenu>
    );
}

export function VideoRow({
    video: _video,
}: {
    video: BaseVideoResponse;
}): JSX.Element {
    const $video = useMedia(_video);

    const handlePlay = (): void => {
        rockIt.queueManager.setMedia([$video], $video.publicId);
        rockIt.queueManager.moveToMedia($video.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <MediaContextMenu
            media={$video}
            location={EMediaContextLocation.LIBRARY}
        >
            <SelectableRow media={$video}>
                <div
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors"
                    onClick={handlePlay}
                >
                    <VideoCover
                        src={
                            $video.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        alt={$video.name}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-foreground-strong truncate font-medium">
                            {$video.name}
                        </p>
                        <Artists
                            artists={$video.artists ?? []}
                            className="text-muted-foreground justify-start text-sm"
                        />
                    </div>
                </div>
            </SelectableRow>
        </MediaContextMenu>
    );
}

export function SongRow({
    song: _song,
    albumName,
    location = EMediaContextLocation.LIBRARY,
}: {
    song: BaseSongWithoutAlbumResponse;
    albumName?: string;
    location?: EMediaContextLocation;
}): JSX.Element {
    const $song = useMedia(_song);

    const handlePlay = (): void => {
        rockIt.queueManager.setMedia([$song], $song.publicId);
        rockIt.queueManager.moveToMedia($song.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <MediaContextMenu media={$song} location={location}>
            <SelectableRow media={$song}>
                <div
                    className="hover:bg-muted focus-visible:outline-primary flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 focus-visible:outline-2"
                    role="button"
                    data-library-drag-handle="true"
                    tabIndex={0}
                    onKeyDown={(event): void => {
                        if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                        ) {
                            event.preventDefault();
                            event.currentTarget.click();
                        }
                    }}
                    onClick={handlePlay}
                >
                    <SquareCover
                        src={
                            $song.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        alt={$song.name}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="text-foreground-strong truncate font-medium">
                                {$song.name}
                            </p>
                            <OfflineIndicator
                                publicId={$song.publicId}
                                className="h-5 w-5"
                            />
                        </div>
                        <Artists
                            artists={$song.artists ?? []}
                            className="text-muted-foreground justify-start text-sm"
                        />
                        {albumName && (
                            <p
                                className="text-muted-foreground truncate text-sm"
                                title={albumName}
                            >
                                {albumName}
                            </p>
                        )}
                    </div>
                </div>
            </SelectableRow>
        </MediaContextMenu>
    );
}

export function StationRow({
    station: _station,
}: {
    station: BaseStationResponse;
}): JSX.Element {
    const vocabulary = useVocabulary();

    const $station = useMedia(_station);

    const handlePlay = (): void => {
        rockIt.queueManager.setMedia([$station], $station.publicId);
        rockIt.queueManager.moveToMedia($station.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <MediaContextMenu
            media={$station}
            location={EMediaContextLocation.LIBRARY}
        >
            <SelectableRow media={$station}>
                <div
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
                    onClick={handlePlay}
                >
                    <SquareCover
                        src={$station.imageUrl}
                        alt={$station.name}
                        fallback="/radio-placeholder.png"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-foreground-strong truncate font-medium">
                            {$station.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                            {vocabulary.RADIO_STATIONS}
                        </p>
                    </div>
                </div>
            </SelectableRow>
        </MediaContextMenu>
    );
}

/* ------------------------------------------------------- */
/* ARTIST-GROUPED LIST VIEW (albums in list mode)         */
/* ------------------------------------------------------- */

function ArtistGroupHeader({ name }: { name: string }): JSX.Element {
    return (
        <h3 className="text-muted-foreground mt-6 mb-1 px-1 text-xs font-semibold tracking-widest uppercase">
            <Link href={artistPageUrl(name)}>{name}</Link>
        </h3>
    );
}

export function AlbumListView({
    albums,
}: {
    albums: BaseAlbumWithoutSongsResponse[];
}): JSX.Element {
    const groups = useMemo(
        (): [string, BaseAlbumWithoutSongsResponse[]][] =>
            groupByArtist(albums),
        [albums]
    );

    return (
        <div className="px-4">
            {groups.map(([artist, artistAlbums]): JSX.Element => (
                <div key={artist}>
                    <ArtistGroupHeader name={artist} />
                    {artistAlbums.map((album): JSX.Element => (
                        <AlbumRow key={album.publicId} album={album} />
                    ))}
                </div>
            ))}
        </div>
    );
}
