"use client";

import { JSX, ReactNode, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithoutAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import {
    EMediaContextLocation,
    TMediaWithSearch,
    Vocabulary,
} from "@rockit/shared";
import { isDownloadable } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import { DownloadStatusIcon } from "@/components/DownloadStatusIcon/DownloadStatusIcon";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

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
function CardShell({ children }: { children: ReactNode }): JSX.Element {
    return <div className="mx-auto w-full max-w-62.5">{children}</div>;
}

/* ------------------------------------------------------- */
/* GENERIC CARD                                            */
/* ------------------------------------------------------- */

interface LibraryCardProps {
    media: TMediaWithSearch;
    location?: EMediaContextLocation;
    imageUrl: string;
    aspectRatio?: "square" | "video";
    badge: keyof Vocabulary;
    name: string;
    subtitle?: ReactNode;
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    /** Applied to the outer link/div wrapper. */
    className?: string;
    /** Applied to an inner wrapper around image + name + subtitle (not children). */
    contentClassName?: string;
    /** Number of undownloaded items (shown as a small badge for albums/playlists). */
    undownloadedCount?: number;
    children?: ReactNode;
}

function LibraryCard({
    media,
    location = EMediaContextLocation.LIBRARY,
    imageUrl,
    aspectRatio = "square",
    badge,
    name,
    subtitle,
    href,
    onClick,
    className = "",
    contentClassName,
    undownloadedCount,
    children,
}: LibraryCardProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const linkClass = `library-item relative flex flex-col transition-transform md:hover:scale-105 ${className}`;
    const isVideo = aspectRatio === "video";
    const [cardImgSrc, setCardImgSrc] = useState(
        imageUrl || "/radio-placeholder.png"
    );

    const imageBlock = (
        <div
            className={
                isVideo
                    ? "relative aspect-video w-full overflow-hidden rounded-md"
                    : "relative"
            }
        >
            {isVideo ? (
                <Image
                    alt={name}
                    src={cardImgSrc}
                    fill
                    sizes={COVER_SIZES}
                    className="object-cover"
                    onError={(): void =>
                        setCardImgSrc("/radio-placeholder.png")
                    }
                />
            ) : (
                <Image
                    alt={name}
                    src={cardImgSrc}
                    width={COVER_PX}
                    height={COVER_PX}
                    sizes={COVER_SIZES}
                    className="aspect-square w-full rounded-md object-cover"
                    onError={(): void =>
                        setCardImgSrc("/radio-placeholder.png")
                    }
                />
            )}
            <div className="absolute top-1 left-1 flex gap-1">
                <span className="rounded bg-black/60 px-1 text-[10px] leading-4 font-semibold text-white">
                    {$vocabulary[badge].toUpperCase()}
                </span>
                {undownloadedCount !== undefined && undownloadedCount > 0 && (
                    <span className="flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px] leading-4 text-white">
                        ↓{undownloadedCount}
                    </span>
                )}
            </div>
        </div>
    );

    const textBlock = (
        <>
            <p className="mt-1 truncate text-center font-semibold">{name}</p>
            {subtitle !== undefined &&
                (typeof subtitle === "string" ? (
                    <p className="truncate text-center text-sm text-gray-400">
                        {subtitle}
                    </p>
                ) : (
                    <div className="text-center text-sm text-gray-400">
                        {subtitle}
                    </div>
                ))}
        </>
    );

    const inner = contentClassName ? (
        <div className={contentClassName}>
            {imageBlock}
            {textBlock}
        </div>
    ) : (
        <>
            {imageBlock}
            {textBlock}
        </>
    );

    return (
        <CardShell>
            <MediaContextMenu media={media} location={location}>
                {href ? (
                    <>
                        <Link href={href} className={linkClass}>
                            {imageBlock}
                            {textBlock}
                        </Link>
                        {children}
                    </>
                ) : (
                    <div
                        className={`${linkClass} cursor-pointer`}
                        onClick={onClick}
                    >
                        {inner}
                        {children}
                    </div>
                )}
            </MediaContextMenu>
        </CardShell>
    );
}

/* ------------------------------------------------------- */
/* EXPORTED CARD COMPONENTS                                */
/* ------------------------------------------------------- */

export function PlaylistCard({
    playlist,
}: {
    playlist: BasePlaylistWithoutMediasResponse;
}): JSX.Element {
    return (
        <LibraryCard
            media={playlist}
            imageUrl={playlist.imageUrl}
            badge="PLAYLIST"
            name={playlist.name}
            subtitle={playlist.owner.name}
            href={playlist.url}
        />
    );
}

export function AlbumCard({
    album,
}: {
    album: BaseAlbumWithoutSongsResponse;
}): JSX.Element {
    return (
        <LibraryCard
            media={album}
            imageUrl={album.imageUrl}
            badge="ALBUM"
            name={album.name}
            subtitle={
                <Artists
                    artists={album.artists}
                    className="text-sm text-gray-400"
                    linkable={false}
                />
            }
            href={album.url}
            undownloadedCount={album.undownloadedCount}
        />
    );
}

export function VideoCard({
    video: _video,
}: {
    video: BaseVideoResponse;
}): JSX.Element {
    const $video = useMedia(_video);
    const openMenuRef = useRef<(x: number, y: number) => void>(undefined);
    const downloaded = !isDownloadable($video) || $video.downloaded;

    const handleClick = (e: React.MouseEvent): void => {
        if (!downloaded) {
            openMenuRef.current?.(e.clientX, e.clientY);
            return;
        }
        rockIt.queueManager.setMedia([$video], $video.publicId);
        rockIt.queueManager.moveToMedia($video.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <LibraryCard
            media={$video}
            imageUrl={$video.imageUrl}
            aspectRatio="video"
            badge="VIDEO"
            name={$video.name}
            subtitle={
                <Artists
                    artists={$video.artists}
                    className="text-sm text-gray-400"
                />
            }
            onClick={handleClick}
            className={!downloaded ? "opacity-50" : ""}
        />
    );
}

/** Square song card — used only inside the masonry "All" view. */
export function SongCard({
    song: _song,
}: {
    song: BaseSongWithoutAlbumResponse;
}): JSX.Element {
    const $song = useMedia(_song);
    const openMenuRef = useRef<(x: number, y: number) => void>(undefined);
    const downloaded = !isDownloadable($song) || $song.downloaded;

    const handleClick = (e: React.MouseEvent): void => {
        if (!downloaded) {
            openMenuRef.current?.(e.clientX, e.clientY);
            return;
        }
        rockIt.queueManager.setMedia([$song], $song.publicId);
        rockIt.queueManager.moveToMedia($song.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <LibraryCard
            media={$song}
            imageUrl={$song.imageUrl}
            badge="SONG"
            name={$song.name}
            subtitle={
                <Artists
                    artists={$song.artists}
                    className="text-sm text-gray-400"
                />
            }
            onClick={handleClick}
            contentClassName={!downloaded ? "opacity-50" : ""}
        >
            <DownloadStatusIcon
                stroke={0.8}
                publicId={$song.publicId}
                className="absolute h-full w-full"
            />
        </LibraryCard>
    );
}

/** Square station card — used only inside the masonry "All" view. */
export function StationCard({
    station: _station,
}: {
    station: BaseStationResponse;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $station = useMedia(_station);

    const handlePlay = (): void => {
        rockIt.queueManager.setMedia([$station], $station.publicId);
        rockIt.queueManager.moveToMedia($station.publicId);
        rockIt.mediaPlayerManager.play();
    };

    return (
        <LibraryCard
            media={$station}
            imageUrl={$station.imageUrl}
            badge="RADIO_STATION"
            name={$station.name}
            subtitle={$vocabulary.RADIO_STATION}
            onClick={handlePlay}
        />
    );
}
