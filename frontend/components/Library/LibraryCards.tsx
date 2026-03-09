"use client";

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

/**
 * Maximum rendered cover size in pixels.
 * The `sizes` attribute tells the browser not to download anything larger.
 * Bug fix: each card also sets `max-w-[250px] w-full mx-auto` so grid cells
 * wider than 250 px (on very wide screens) don't stretch the cover past this
 * limit.
 */
const COVER_PX = 250;
const COVER_SIZES = "(max-width: 640px) 50vw, 250px";

/** Shared wrapper for every grid card — enforces the 250 px cap. */
function CardShell({ children }: { children: React.ReactNode }) {
    return <div className="max-w-62.5 mx-auto w-full">{children}</div>;
}

export function PlaylistCard({ playlist }: { playlist: BasePlaylistResponse }) {
    return (
        <CardShell>
            <AddListContextMenu list={playlist}>
                <Link
                    href={`/playlist/${playlist.publicId}`}
                    className="library-item flex flex-col transition-transform md:hover:scale-105"
                >
                    <Image
                        alt={playlist.name}
                        src={
                            playlist.internalImageUrl ??
                            rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                        }
                        width={COVER_PX}
                        height={COVER_PX}
                        sizes={COVER_SIZES}
                        className="aspect-square w-full rounded-md object-cover"
                    />
                    <p className="mt-1 truncate text-center font-semibold">
                        {playlist.name}
                    </p>
                    <p className="truncate text-center text-sm text-gray-400">
                        {playlist.owner}
                    </p>
                </Link>
            </AddListContextMenu>
        </CardShell>
    );
}

export function AlbumCard({ album }: { album: BaseAlbumWithoutSongsResponse }) {
    return (
        <CardShell>
            <AddListContextMenu list={album}>
                <Link
                    href={`/album/${album.publicId}`}
                    className="library-item flex flex-col transition-transform md:hover:scale-105"
                >
                    <Image
                        alt={album.name}
                        src={
                            album.internalImageUrl ??
                            rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                        }
                        width={COVER_PX}
                        height={COVER_PX}
                        sizes={COVER_SIZES}
                        className="aspect-square w-full rounded-md object-cover"
                    />
                    <p className="mt-1 truncate text-center font-semibold">
                        {album.name}
                    </p>
                    <p className="truncate text-center text-sm text-gray-400">
                        {album.artists.map((a) => a.name).join(", ")}
                    </p>
                </Link>
            </AddListContextMenu>
        </CardShell>
    );
}

export function VideoCard({ video }: { video: BaseVideoResponse }) {
    return (
        <CardShell>
            <Link
                href={`/video/${video.publicId}`}
                className="library-item flex flex-col transition-transform md:hover:scale-105"
            >
                {/* 16:9 aspect ratio for video thumbnails */}
                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                    <Image
                        src={
                            video.internalImageUrl ??
                            rockIt.SONG_PLACEHOLDER_IMAGE_URL
                        }
                        alt={video.name}
                        fill
                        sizes={COVER_SIZES}
                        className="object-cover"
                    />
                </div>
                <p className="mt-1 truncate text-center font-semibold">
                    {video.name}
                </p>
            </Link>
        </CardShell>
    );
}

/** Square song card — used only inside the masonry "All" view. */
export function SongCard({ song }: { song: BaseSongWithoutAlbumResponse }) {
    return (
        <CardShell>
            <div className="library-item flex flex-col">
                <Image
                    alt={song.name}
                    src={
                        song.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    width={COVER_PX}
                    height={COVER_PX}
                    sizes={COVER_SIZES}
                    className="aspect-square w-full rounded-md object-cover"
                />
                <p className="mt-1 truncate text-center font-semibold">
                    {song.name}
                </p>
                <p className="truncate text-center text-sm text-gray-400">
                    {song.artists?.map((a) => a.name).join(", ") ??
                        "Unknown Artist"}
                </p>
            </div>
        </CardShell>
    );
}

/** Square station card — used only inside the masonry "All" view. */
export function StationCard({ station }: { station: BaseStationResponse }) {
    return (
        <CardShell>
            <div className="library-item flex flex-col">
                <Image
                    alt={station.name}
                    src={
                        station.internalImageUrl ??
                        rockIt.STATION_PLACEHOLDER_IMAGE_URL
                    }
                    width={COVER_PX}
                    height={COVER_PX}
                    sizes={COVER_SIZES}
                    className="aspect-square w-full rounded-md object-cover"
                />
                <p className="mt-1 truncate text-center font-semibold">
                    {station.name}
                </p>
                <p className="truncate text-center text-sm text-gray-400">
                    Radio Station
                </p>
            </div>
        </CardShell>
    );
}
