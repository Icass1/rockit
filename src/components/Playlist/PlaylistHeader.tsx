"use client";

import ListOptions from "@/components/ListHeader/ListOptions";
import { Disc3, Heart, History } from "lucide-react";
import PlayListButton from "@/components/ListHeader/PlayListButton";
import { getMinutes } from "@/lib/utils/getTime";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItPlaylist } from "@/lib/rockit/rockItPlaylist";
import { RockItPlaylistResponse } from "@/responses/rockItPlaylistResponse";

export default function PlaylistHeader({
    className,
    playlistResponse,
}: {
    className: string;
    playlistResponse: RockItPlaylistResponse;
}) {
    const lang = useLanguage();
    if (!lang) return false;

    const playlist = RockItPlaylist.fromResponse(playlistResponse);

    let coverIcon;

    if (playlist.publicId == "liked") {
        coverIcon = (
            <Heart
                className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    } else if (playlist.publicId == "most-listened") {
        coverIcon = (
            <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else if (playlist.publicId == "recent-mix") {
        coverIcon = (
            <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    }
    const specialPlaylist = ["liked", "most-listened", "recent-mix"].includes(
        playlist.publicId
    );

    return (
        <div
            className={
                "relative top-24 flex h-[26rem] flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
        >
            {/* Imagen de la playlist */}
            <div className="relative aspect-square h-auto w-full overflow-hidden rounded-xl bg-[rgb(15,15,15)] md:rounded-md md:bg-none">
                {specialPlaylist ? (
                    <div
                        className="relative h-full w-full rounded-md object-cover"
                        style={{
                            backgroundImage:
                                "url(/api/image/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        {coverIcon}
                    </div>
                ) : (
                    <div className="h-full w-full">
                        <Image
                            width={370}
                            height={370}
                            alt={playlist.name}
                            src={
                                playlist.internalImageUrl ??
                                rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                            }
                            className="absolute h-full w-full"
                        />
                        <PlayListButton
                            id={playlist.publicId}
                            type="playlist"
                        />
                    </div>
                )}
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
                {playlist.songs.length} {lang.songs} |{" "}
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
