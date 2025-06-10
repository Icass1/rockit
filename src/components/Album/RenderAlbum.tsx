"use client";

import { GetAlbum } from "@/lib/getAlbum";
import Image from "@/components/Image";
import PlayListButton from "@/components/ListHeader/PlayListButton";
import ListOptions from "@/components/ListHeader/ListOptions";
import { useRouter } from "next/navigation";
import { getMinutes, getYear } from "@/lib/getTime";
import { Disc } from "lucide-react";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import AlbumSong from "@/components/ListSongs/AlbumSong";
import { currentList, currentListSongs } from "@/stores/currentList";

export default function RenderAlbum({ _album }: { _album: GetAlbum }) {
    const { album, discs, songs } = _album;

    const router = useRouter();
    const $lang = useStore(langData);

    currentListSongs.set(songs);
    currentList.set({ id: album.id, type: "album" });

    if (!$lang) return false;

    const inDatabase = typeof songs.find((song) => !song.path) == "undefined";

    return (
        <div className="relative flex h-full w-full flex-col overflow-y-auto px-2 md:grid md:grid-cols-[min-content_1fr] md:px-0">
            <Image
                showSkeleton={false}
                src={`/api/image/blur/${album.image}`}
                alt=""
                className="fixed top-0 left-0 z-0 h-full w-full object-cover opacity-35"
            />
            <div className="relative top-24 z-50 mx-4 flex h-full flex-col items-center justify-center gap-1 md:top-0 md:max-w-md">
                <div className="relative aspect-square h-72 overflow-hidden rounded-xl md:h-[40vh] md:rounded-md">
                    <Image
                        alt={album.name}
                        src={
                            album.image
                                ? `/api/image/${album.image}`
                                : album.images[0].url
                        }
                        className="absolute h-full w-full object-fill"
                    />
                    <PlayListButton
                        type="album"
                        id={album.id}
                        inDatabase={inDatabase}
                        url={`https://open.spotify.com/album/${album.id}`}
                    />
                </div>

                <div className="mx-auto flex w-fit flex-row items-center gap-2 z-50">
                    <label className="text-center text-2xl font-semibold text-balance">
                        {album.name}
                    </label>

                    <ListOptions
                        type="album"
                        id={album.id}
                        url={`https://open.spotify.com/album/${album.id}`}
                        inDatabase={inDatabase}
                    />
                </div>

                <div className="flex flex-wrap justify-center text-xl font-semibold text-stone-400 md:justify-start">
                    {album.artists.map((artist, index) => (
                        <span
                            className="flex items-center space-x-1"
                            key={artist.id}
                        >
                            <label
                                className="line-clamp-2 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/artist/${artist.id}`);
                                }}
                                // onclick={`event.preventDefault(); event.stopPropagation(); location.href='/artist/${artist.id}'`}
                            >
                                {`${artist.name}${
                                    index < album.artists.length - 1 ? ", " : ""
                                }`}
                            </label>
                        </span>
                    ))}
                </div>

                <label className="text-center text-sm text-stone-400">
                    {getYear(album.releaseDate)} | {album.songs.length} Songs |{" "}
                    {getMinutes(
                        songs.reduce((accumulator: number, song) => {
                            return accumulator + (song?.duration || 0);
                        }, 0)
                    )}{" "}
                    Minutes
                </label>
            </div>

            <div className="z-10 mt-5 flex h-full w-full flex-col px-2 md:mt-0 md:overflow-auto md:px-6">
                <div className="min-h-24"></div>

                {discs.map((discSongs, discIndex) => {
                    return (
                        <div key={discIndex}>
                            <label className="mb-2 flex flex-row items-center gap-2 text-lg font-semibold text-neutral-400">
                                <Disc className="h-6 w-6" />
                                {$lang.disc} {discIndex + 1}
                            </label>

                            {discSongs.map((song, songIndex) => {
                                if (song) {
                                    return (
                                        <AlbumSong
                                            key={song.id}
                                            song={song}
                                            index={songIndex}
                                        />
                                    );
                                } else {
                                    return (
                                        <div key={songIndex}>
                                            Song is undefined
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    );
                })}
                <div className="min-h-24 md:min-h-24"></div>
            </div>
        </div>
    );
}
