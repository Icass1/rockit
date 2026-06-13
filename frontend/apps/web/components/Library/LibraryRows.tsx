"use client";

import { useMemo, type JSX } from "react";
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
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

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
function SquareCover({ src, alt }: { src: string; alt: string }): JSX.Element {
    return (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
            <Image
                src={src}
                alt={alt}
                fill
                sizes="48px"
                className="object-cover select-none"
            />
        </div>
    );
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
            <Link
                prefetch={false}
                href={album.url}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-800"
            >
                <SquareCover
                    src={album.imageUrl ?? rockIt.ALBUM_PLACEHOLDER_IMAGE_URL}
                    alt={album.name}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                        {album.name}
                    </p>
                    <p className="truncate text-sm text-neutral-400">
                        {album.artists.map((a): string => a.name).join(", ")}
                    </p>
                </div>
            </Link>
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
            <Link
                prefetch={false}
                href={playlist.url}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-800"
            >
                <SquareCover
                    src={
                        playlist.imageUrl ??
                        rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                    }
                    alt={playlist.name}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                        {playlist.name}
                    </p>
                    <p className="truncate text-sm text-neutral-400">
                        {playlist.owner.name}
                    </p>
                </div>
            </Link>
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
            <div
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-800"
                onClick={handlePlay}
            >
                <VideoCover
                    src={$video.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL}
                    alt={$video.name}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                        {$video.name}
                    </p>
                    <p className="truncate text-sm text-neutral-400">
                        {$video.artists
                            ?.map((a): string => a.name)
                            .join(", ") ?? ""}
                    </p>
                </div>
            </div>
        </MediaContextMenu>
    );
}

export function SongRow({
    song: _song,
}: {
    song: BaseSongWithoutAlbumResponse;
}): JSX.Element {
    const $song = useMedia(_song);

    const handlePlay = (): void => {
        rockIt.queueManager.setMedia([$song], $song.publicId);
        rockIt.queueManager.moveToMedia($song.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <MediaContextMenu
            media={$song}
            location={EMediaContextLocation.LIBRARY}
        >
            <div
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-neutral-800"
                onClick={handlePlay}
            >
                <SquareCover
                    src={$song.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL}
                    alt={$song.name}
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                        {$song.name}
                    </p>
                    <p className="truncate text-sm text-neutral-400">
                        {$song.artists?.map((a): string => a.name).join(", ") ??
                            "Unknown Artist"}
                    </p>
                </div>
            </div>
        </MediaContextMenu>
    );
}

export function StationRow({
    station: _station,
}: {
    station: BaseStationResponse;
}): JSX.Element {
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
            <div
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-neutral-800"
                onClick={handlePlay}
            >
                <SquareCover src={$station.imageUrl} alt={$station.name} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                        {$station.name}
                    </p>
                    <p className="truncate text-sm text-neutral-400">
                        Radio Station
                    </p>
                </div>
            </div>
        </MediaContextMenu>
    );
}

/* ------------------------------------------------------- */
/* ARTIST-GROUPED LIST VIEW (albums in list mode)         */
/* ------------------------------------------------------- */

function ArtistGroupHeader({ name }: { name: string }): JSX.Element {
    return (
        <h3 className="mt-6 mb-1 px-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            {name}
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
            {groups.map(
                ([artist, artistAlbums]): JSX.Element => (
                    <div key={artist}>
                        <ArtistGroupHeader name={artist} />
                        {artistAlbums.map(
                            (album): JSX.Element => (
                                <AlbumRow key={album.publicId} album={album} />
                            )
                        )}
                    </div>
                )
            )}
        </div>
    );
}
