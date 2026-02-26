"use client";

import Image from "next/image";
import DownloadAnimation from "@/components/ListHeader/DownloadAnimation";
import DownloadListButton from "@/components/ListHeader/DownloadListButton";
import PlayListButton from "@/components/ListHeader/PlayListButton";

interface ListCoverProps {
    publicId: string;
    type: "album" | "playlist";
    name: string;
    imageUrl: string;
    isDownloading: boolean;
    downloadProgress: number;
    anyDownloaded: boolean;
    allDownloaded: boolean;
    /** Extra class for sizing (e.g. "h-72 md:h-[40vh]") */
    sizeClassName?: string;
}

/**
 * Shared cover component for album and playlist pages.
 * Contains the artwork, download overlay animation, and the play/download buttons.
 * Both RenderAlbum and PlaylistHeader use this to avoid duplicated JSX.
 */
export function ListCover({
    publicId,
    type,
    name,
    imageUrl,
    isDownloading,
    downloadProgress,
    anyDownloaded,
    allDownloaded,
    sizeClassName = "h-72 md:h-[40vh]",
}: ListCoverProps) {
    return (
        <div
            className={`relative aspect-square w-full overflow-hidden rounded-xl md:rounded-md ${sizeClassName}`}
        >
            <Image
                width={600}
                height={600}
                alt={name}
                src={imageUrl}
                className="absolute h-full w-full object-fill"
                priority
            />

            {isDownloading && (
                <div className="absolute top-10 right-10 bottom-10 left-10">
                    <DownloadAnimation progress={downloadProgress} />
                </div>
            )}

            <div className="absolute right-3 bottom-3 flex h-16 w-auto flex-row gap-4 md:h-20">
                {anyDownloaded && <PlayListButton type={type} id={publicId} />}
                {!allDownloaded && (
                    <DownloadListButton type={type} publicId={publicId} />
                )}
            </div>
        </div>
    );
}
