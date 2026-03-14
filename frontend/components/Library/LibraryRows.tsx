"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { AddListContextMenu } from "@/components/Library/LibraryContextMenu";

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
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

/* ------------------------------------------------------- */
/* SHARED PRIMITIVES                                       */
/* ------------------------------------------------------- */

/** Small square cover thumbnail used in every row. */
function SquareCover({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
            <Image
                src={src}
                alt={alt}
                fill
                sizes="48px"
                className="object-cover"
            />
        </div>
    );
}

/** Wider 16:9 thumbnail for video rows. */
function VideoCover({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="relative h-12 w-21.25 shrink-0 overflow-hidden rounded-md">
            <Image
                src={src}
                alt={alt}
                fill
                sizes="85px"
                className="object-cover"
            />
        </div>
    );
}

/* ------------------------------------------------------- */
/* ROW COMPONENTS                                          */
/* ------------------------------------------------------- */

export function AlbumRow({ album }: { album: BaseAlbumWithoutSongsResponse }) {
    return (
        <AddListContextMenu list={album}>
            <Link
                href={`/album/${album.publicId}`}
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
                        {album.artists.map((a) => a.name).join(", ")}
                    </p>
                </div>
            </Link>
        </AddListContextMenu>
    );
}

export function PlaylistRow({ playlist }: { playlist: BasePlaylistResponse }) {
    return (
        <AddListContextMenu list={playlist}>
            <Link
                href={`/playlist/${playlist.publicId}`}
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
                        {playlist.owner}
                    </p>
                </div>
            </Link>
        </AddListContextMenu>
    );
}

export function VideoRow({ video }: { video: BaseVideoResponse }) {
    return (
        <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-neutral-800">
            <VideoCover
                src={video.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL}
                alt={video.name}
            />
            <p className="min-w-0 flex-1 truncate font-medium text-white">
                {video.name}
            </p>
        </div>
    );
}

export function SongRow({ song }: { song: BaseSongWithoutAlbumResponse }) {
    return (
        <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-neutral-800">
            <SquareCover
                src={song.imageUrl ?? rockIt.SONG_PLACEHOLDER_IMAGE_URL}
                alt={song.name}
            />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{song.name}</p>
                <p className="truncate text-sm text-neutral-400">
                    {song.artists?.map((a) => a.name).join(", ") ??
                        "Unknown Artist"}
                </p>
            </div>
        </div>
    );
}

export function StationRow({ station }: { station: BaseStationResponse }) {
    return (
        <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-neutral-800">
            <SquareCover src={station.imageUrl} alt={station.name} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                    {station.name}
                </p>
                <p className="truncate text-sm text-neutral-400">
                    Radio Station
                </p>
            </div>
        </div>
    );
}

/* ------------------------------------------------------- */
/* ARTIST-GROUPED LIST VIEW (albums in list mode)         */
/* ------------------------------------------------------- */

function ArtistGroupHeader({ name }: { name: string }) {
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
}) {
    const groups = useMemo(() => groupByArtist(albums), [albums]);

    return (
        <div className="px-4">
            {groups.map(([artist, artistAlbums]) => (
                <div key={artist}>
                    <ArtistGroupHeader name={artist} />
                    {artistAlbums.map((album) => (
                        <AlbumRow key={album.publicId} album={album} />
                    ))}
                </div>
            ))}
        </div>
    );
}
