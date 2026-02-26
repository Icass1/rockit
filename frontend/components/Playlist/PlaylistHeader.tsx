"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Playlist } from "@/lib/rockit/playlist";
import { getMinutes } from "@/lib/utils/getTime";
import { useListDownload } from "@/components/List/hooks/useListDownload";
import { ListCover } from "@/components/List/ListCover";
import ListOptions from "@/components/ListHeader/ListOptions";

export default function PlaylistHeader({
    className,
    playlistResponse,
}: {
    className: string;
    playlistResponse: Parameters<typeof Playlist.fromResponse>[0];
}) {
    const playlist = Playlist.fromResponse(playlistResponse);
    const { langFile: lang } = useLanguage();

    const { isDownloading, downloadProgress, anyDownloaded, allDownloaded } =
        useListDownload({
            publicId: playlist.publicId,
            type: "playlist",
            songs: playlist.songs,
        });

    if (!lang) return false;

    const downloadCount = playlist.songs.filter((s) => s.downloaded).length;
    const totalDuration = playlist.songs.reduce(
        (acc, s) => acc + (s.duration || 0),
        0
    );

    return (
        <div
            className={
                "relative top-24 flex h-104 flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
        >
            <ListCover
                publicId={playlist.publicId}
                type="playlist"
                name={playlist.name}
                imageUrl={playlist.internalImageUrl ?? "/song-placeholder.png"}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                anyDownloaded={anyDownloaded}
                allDownloaded={allDownloaded}
            />

            <div className="mx-auto flex w-fit flex-row items-center gap-3">
                <span className="text-2xl font-semibold text-balance">
                    {playlist.name}
                </span>
                <ListOptions
                    type="playlist"
                    publicId={playlist.publicId}
                    internalImageUrl={playlist.internalImageUrl ?? undefined}
                    allSongsInDatabase={false}
                />
            </div>

            <span className="flex flex-wrap justify-center text-xl font-semibold text-stone-400">
                {playlist.owner}
            </span>

            <span className="text-center text-sm text-stone-400">
                {playlist.songs.length} {lang.songs} | {downloadCount} songs
                downloaded | {getMinutes(totalDuration)} {lang.minutes}
            </span>
        </div>
    );
}
