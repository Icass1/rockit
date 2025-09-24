"use client";

import ListOptions from "@/components/ListHeader/ListOptions";
import type { PlaylistDB, PlaylistDBSong } from "@/lib/db/playlist";
import type { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { Disc3, Heart, History } from "lucide-react";
import PlayListButton from "@/components/ListHeader/PlayListButton";
import Image from "@/components/Image";
import { CSSProperties } from "react";
import { getMinutes } from "@/lib/utils/getTime";

export default function PlaylistHeader({
    inDatabase,
    id,
    songs,
    className,
    playlist,
    style,
}: {
    inDatabase: boolean;
    id: string | "liked" | "most-listened" | "recent-mix";
    songs: SongDB<
        | "id"
        | "images"
        | "image"
        | "name"
        | "albumId"
        | "duration"
        | "artists"
        | "path"
        | "albumName"
    >[];
    className: string;
    style?: CSSProperties;
    playlist:
        | PlaylistDB
        | {
              name: string;
              songs: PlaylistDBSong[];
              image: string;
              images:
                  | {
                        url: string;
                    }[]
                  | undefined;
              owner: string;
          };
}) {
    const $lang = useStore(langData);
    if (!$lang) return false;

    let coverIcon;

    if (id == "liked") {
        coverIcon = (
            <Heart
                className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                fill="white"
            />
        );
    } else if (id == "most-listened") {
        coverIcon = (
            <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else if (id == "recent-mix") {
        coverIcon = (
            <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    }
    const specialPlaylist = ["liked", "most-listened", "recent-mix"].includes(
        id
    );

    return (
        <div
            className={
                "relative top-24 flex h-[26rem] flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
            style={style}
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
                            src={getImageUrl({
                                imageId: playlist.image,
                                fallback:
                                    playlist?.images?.[0]?.url ??
                                    "/api/image/rockit-background.png",
                                height: 370,
                                width: 370,
                            })}
                            className="absolute h-full w-full"
                        />
                        <PlayListButton
                            id={id}
                            type="playlist"
                            inDatabase={inDatabase}
                            url={`https://open.spotify.com/playlist/${id}`}
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
                    url={`https://open.spotify.com/playlist/${id}`}
                    type="playlist"
                    id={id}
                    image={playlist.image}
                    inDatabase={inDatabase}
                />
            </div>

            {/* Propietario */}
            <label className="flex flex-wrap justify-center text-xl font-semibold text-stone-400">
                {playlist.owner}
            </label>

            {/* Información adicional */}
            <label className="text-center text-sm text-stone-400">
                {playlist.songs.length} {$lang.songs} |{" "}
                {getMinutes(
                    songs.reduce((accumulator: number, song) => {
                        return accumulator + (song?.duration || 0);
                    }, 0)
                )}{" "}
                {$lang.minutes}
            </label>
        </div>
    );
}
