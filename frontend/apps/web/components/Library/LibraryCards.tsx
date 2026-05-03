"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { isDownloadable } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import UnifiedMediaContextMenu from "@/components/Library/UnifiedMediaContextMenu";

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
    return <div className="mx-auto w-full max-w-62.5">{children}</div>;
}

export function PlaylistCard({ playlist }: { playlist: BasePlaylistResponse }) {
    return (
        <CardShell>
            <UnifiedMediaContextMenu media={playlist}>
                <Link
                    href={playlist.url}
                    className="library-item flex flex-col transition-transform md:hover:scale-105"
                >
                    <Image
                        alt={playlist.name}
                        src={
                            playlist.imageUrl ??
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
            </UnifiedMediaContextMenu>
        </CardShell>
    );
}

export function AlbumCard({ album }: { album: BaseAlbumWithoutSongsResponse }) {
    return (
        <CardShell>
            <UnifiedMediaContextMenu media={album}>
                <Link
                    href={album.url}
                    className="library-item flex flex-col transition-transform md:hover:scale-105"
                >
                    <Image
                        alt={album.name}
                        src={album.imageUrl}
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
            </UnifiedMediaContextMenu>
        </CardShell>
    );
}

export function VideoCard({ video }: { video: BaseVideoResponse }) {
    const openMenuRef = useRef<(x: number, y: number) => void>(undefined);
    const downloaded = !isDownloadable(video) || video.downloaded;

    const handleClick = (e: React.MouseEvent) => {
        if (!downloaded) {
            openMenuRef.current?.(e.clientX, e.clientY);
            return;
        }
        rockIt.queueManager.setMedia([video], "library", video.publicId);
        rockIt.queueManager.moveToMedia(video.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <CardShell>
            <UnifiedMediaContextMenu media={video}>
                <div
                    className={`library-item flex cursor-pointer flex-col transition-transform md:hover:scale-105 ${!downloaded && "opacity-50"}`}
                    onClick={handleClick}
                >
                    {/* 16:9 aspect ratio for video thumbnails */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-md">
                        <Image
                            src={video.imageUrl}
                            alt={video.name}
                            fill
                            sizes={COVER_SIZES}
                            className="object-cover"
                        />
                    </div>
                    <p className="mt-1 truncate text-center font-semibold">
                        {video.name}
                    </p>
                </div>
            </UnifiedMediaContextMenu>
        </CardShell>
    );
}

/** Square song card — used only inside the masonry "All" view. */
export function SongCard({ song }: { song: BaseSongWithoutAlbumResponse }) {
    const openMenuRef = useRef<(x: number, y: number) => void>(undefined);
    const downloaded = !isDownloadable(song) || song.downloaded;

    const handleClick = (e: React.MouseEvent) => {
        if (!downloaded) {
            openMenuRef.current?.(e.clientX, e.clientY);
            return;
        }
        rockIt.queueManager.setMedia([song], "library", song.publicId);
        rockIt.queueManager.moveToMedia(song.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <CardShell>
            <UnifiedMediaContextMenu media={song}>
                <div
                    className={`library-item flex cursor-pointer flex-col ${!downloaded && "opacity-50"}`}
                    onClick={handleClick}
                >
                    <Image
                        alt={song.name}
                        src={song.imageUrl}
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
            </UnifiedMediaContextMenu>
        </CardShell>
    );
}

/** Square station card — used only inside the masonry "All" view. */
export function StationCard({ station }: { station: BaseStationResponse }) {
    const handlePlay = () => {
        rockIt.queueManager.setMedia([station], "library", station.publicId);
        rockIt.queueManager.moveToMedia(station.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <CardShell>
            <UnifiedMediaContextMenu media={station}>
                <div
                    className="library-item flex cursor-pointer flex-col"
                    onClick={handlePlay}
                >
                    <Image
                        alt={station.name}
                        src={station.imageUrl}
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
            </UnifiedMediaContextMenu>
        </CardShell>
    );
}
