"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItPlaylist } from "@/lib/rockit/rockItPlaylist";
import { getMinutes } from "@/lib/utils/getTime";
import DownloadAnimation from "@/components/ListHeader/DownloadAnimation";
import DownloadListButton from "@/components/ListHeader/DownloadListButton";
import ListOptions from "@/components/ListHeader/ListOptions";
// import { Disc3, Heart, History } from "lucide-react";
import PlayListButton from "@/components/ListHeader/PlayListButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { RockItPlaylistResponse } from "@/dto/rockItPlaylistResponse";
import { useStore } from "@nanostores/react";

export default function PlaylistHeader({
    className,
    playlistResponse,
}: {
    className: string;
    playlistResponse: RockItPlaylistResponse;
}) {
    const playlist = RockItPlaylist.fromResponse(playlistResponse);

    const $downloadingListsAtom = useStore(
        rockIt.downloaderManager.downloadingListsAtom
    );

    // let coverIcon;

    const [progress, setProgress] = useState(0);
    const [downloadCount, setDownloadCount] = useState(0);

    useEffect(() => {
        rockIt.downloaderManager.downloadingSongsStatusAtom.subscribe(
            (value) => {
                let completed = 0;
                for (const song of value) {
                    if (
                        playlist.songs.find(
                            (playlistSong) =>
                                playlistSong.publicId == song.publicId
                        )
                    ) {
                        if (song.message == "Error") {
                            completed += 100;
                        } else {
                            completed += song.completed;
                        }
                    }
                }
                setProgress(completed / playlist.songs.length);
                setDownloadCount(
                    playlist.songs.filter((song) => song.downloaded).length
                );
            }
        );
    }, [playlist.songs]);

    // if (playlist.publicId == "liked") {
    //     coverIcon = (
    //         <Heart
    //             className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
    //             fill="white"
    //         />
    //     );
    // } else if (playlist.publicId == "most-listened") {
    //     coverIcon = (
    //         <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
    //     );
    // } else if (playlist.publicId == "recent-mix") {
    //     coverIcon = (
    //         <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
    //     );
    // }
    // const specialPlaylist = ["liked", "most-listened", "recent-mix"].includes(
    //     playlist.publicId
    // );

    // console.log("(PlaylistHeader)", { coverIcon, specialPlaylist });

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    const allSongsInDatabase = playlist.songs.every((song) => song.downloaded);
    const anySongDownloaded = playlist.songs.some((song) => song.downloaded);

    return (
        <div
            className={
                "relative top-24 flex h-104 flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
        >
            {/* Imagen de la playlist */}
            <div className="relative aspect-square h-auto w-full overflow-hidden rounded-xl bg-[rgb(15,15,15)] md:rounded-md md:bg-none">
                <Image
                    width={600}
                    height={600}
                    alt={playlist.name}
                    src={playlist.internalImageUrl ?? "/song-placeholder.png"}
                    className="absolute h-full w-full object-fill"
                />
                {$downloadingListsAtom.find(
                    (list) =>
                        list.type == playlist.type &&
                        list.publicId == list.publicId
                ) && (
                    <div className="absolute top-10 right-10 bottom-10 left-10">
                        <DownloadAnimation progress={progress} />
                    </div>
                )}

                <div className="absolute right-3 bottom-3 flex h-16 w-auto flex-row gap-4 md:h-20">
                    {anySongDownloaded && (
                        <PlayListButton type="album" id={playlist.publicId} />
                    )}
                    {!allSongsInDatabase && (
                        <DownloadListButton
                            type="playlist"
                            publicId={playlist.publicId}
                        />
                    )}
                </div>
            </div>

            {/* Nombre de la playlist */}
            <div className="mx-auto flex w-fit flex-row items-center gap-3">
                <label className="text-2xl font-semibold text-balance">
                    {playlist.name}
                </label>
                <ListOptions
                    type="playlist"
                    publicId={playlist.publicId}
                    internalImageUrl={
                        playlist.internalImageUrl ??
                        rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                    }
                    allSongsInDatabase={false}
                />
            </div>

            {/* Propietario */}
            <label className="flex flex-wrap justify-center text-xl font-semibold text-stone-400">
                {playlist.owner}
            </label>

            {/* Información adicional */}
            <label className="text-center text-sm text-stone-400">
                {playlist.songs.length} {lang.songs} | {downloadCount} songs
                downloaded |{" "}
                {getMinutes(
                    playlist.songs.reduce((accumulator: number, song) => {
                        return accumulator + (song.duration || 0);
                    }, 0)
                )}{" "}
                {lang.minutes}
            </label>
        </div>
    );
}
