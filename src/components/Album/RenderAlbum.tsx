"use client";

import PlayListButton from "@/components/ListHeader/PlayListButton";
import ListOptions from "@/components/ListHeader/ListOptions";
import { useRouter } from "next/navigation";
import { getMinutes, getYear } from "@/lib/utils/getTime";
import { Disc } from "lucide-react";
import AlbumSong from "@/components/ListSongs/AlbumSong";
import { RockItAlbumWithSongs } from "@/types/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";

export default function RenderAlbum({
    album,
}: {
    album: RockItAlbumWithSongs;
}) {
    const router = useRouter();
    const lang = useLanguage();

    if (!lang) return false;

    const allSongsInDatabase = album.songs.find((song) => song.downloadUrl)
        ? true
        : false;

    return (
        <div className="relative flex h-full w-full flex-col overflow-y-auto px-2 md:grid md:grid-cols-[min-content_1fr] md:px-0">
            <Image
                width={600}
                height={600}
                src={album.internalImageUrl ?? "/song-placeholder.png"}
                alt=""
                className="fixed top-0 left-0 z-0 h-full w-full object-cover opacity-35"
            />
            <div className="relative top-24 z-50 mx-4 flex h-full flex-col items-center justify-center gap-1 md:top-0 md:max-w-md">
                <div className="relative aspect-square h-72 overflow-hidden rounded-xl md:h-[40vh] md:rounded-md">
                    <Image
                        width={600}
                        height={600}
                        alt={album.name}
                        src={album.internalImageUrl ?? "/song-placeholder.png"}
                        className="absolute h-full w-full object-fill"
                    />
                    <PlayListButton
                        type="album"
                        id={album.publicId}
                        url={`https://open.spotify.com/album/${album.publicId}`}
                    />
                </div>

                <div className="z-50 mx-auto flex w-fit flex-row items-center gap-2">
                    <label className="text-center text-2xl font-semibold text-balance">
                        {album.name}
                    </label>

                    <ListOptions
                        type="album"
                        id={album.publicId}
                        url={`https://open.spotify.com/album/${album.publicId}`}
                        allSongsInDatabase={allSongsInDatabase}
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
                                {lang.disc} {discIndex + 1}
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
