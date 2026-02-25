"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";
import { AlbumWithSongs } from "@/lib/rockit/albumWithSongs";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { getMinutes, getYear } from "@/lib/utils/getTime";
import ListOptions from "@/components/ListHeader/ListOptions";
import PlayListButton from "@/components/ListHeader/PlayListButton";
import AlbumSong from "@/components/ListSongs/AlbumSong";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStore } from "@nanostores/react";
import { groupBy } from "lodash";
import { Disc } from "lucide-react";
import DownloadAnimation from "../ListHeader/DownloadAnimation";
import DownloadListButton from "../ListHeader/DownloadListButton";

export default function RenderAlbum({
    albumResponse,
}: {
    albumResponse: Parameters<typeof AlbumWithSongs.fromResponse>[0];
}) {
    const router = useRouter();
    const { langFile: lang } = useLanguage();

    const $downloadingListsAtom = useStore(
        rockIt.downloaderManager.downloadingListsAtom
    );

    const album = AlbumWithSongs.fromResponse(albumResponse);

    useEffect(() => {
        rockIt.currentListManager.setCurrentListSongs(
            album.songs.map((song) => {
                return new SongWithAlbum({ ...song, album });
            })
        );
    }, [album]);

    const [progress, setProgress] = useState(0);

    useEffect(() => {
        rockIt.downloaderManager.downloadingSongsStatusAtom.subscribe(
            (value) => {
                let completed = 0;
                for (const song of value) {
                    if (
                        album.songs.find(
                            (albumSong) => albumSong.publicId == song.publicId
                        )
                    ) {
                        if (song.message == "Error") {
                            completed += 100;
                        } else {
                            completed += song.completed;
                        }
                    }
                }
                setProgress(completed / album.songs.length);
            }
        );
    }, [album.songs]);

    if (!lang) return false;

    const allSongsInDatabase = album.songs.every((song) => song.downloaded);
    const anySongDownloaded = album.songs.some((song) => song.downloaded);

    const discs = groupBy(album.songs, (song) => song.discNumber);

    return (
        <div className="relative flex h-full w-full flex-col overflow-y-auto px-2 md:grid md:grid-cols-[min-content_1fr] md:px-0">
            {/* <Image
                width={600}
                height={600}
                src={album.internalImageBluredUrl ?? "/song-placeholder.png"}
                alt=""
                className="fixed top-0 left-0 z-0 h-full w-full object-cover opacity-35"
            /> */}
            <div className="relative top-24 z-50 mx-4 flex h-full flex-col items-center justify-center gap-1 md:top-0 md:max-w-md">
                <div className="relative aspect-square h-72 overflow-hidden rounded-xl md:h-[40vh] md:rounded-md">
                    <Image
                        width={600}
                        height={600}
                        alt={album.name}
                        src={album.internalImageUrl ?? "/song-placeholder.png"}
                        className="absolute h-full w-full object-fill"
                    />
                    {$downloadingListsAtom.find(
                        (list) =>
                            list.type == album.type &&
                            list.publicId == list.publicId
                    ) && (
                        <div className="absolute top-10 right-10 bottom-10 left-10">
                            <DownloadAnimation progress={progress} />
                        </div>
                    )}

                    <div className="absolute right-3 bottom-3 flex h-16 w-auto flex-row gap-4 md:h-20">
                        {anySongDownloaded && (
                            <PlayListButton type="album" id={album.publicId} />
                        )}
                        {!allSongsInDatabase && (
                            <DownloadListButton
                                type="album"
                                publicId={album.publicId}
                            />
                        )}
                    </div>
                </div>

                <div className="z-50 mx-auto flex w-fit flex-row items-center gap-2">
                    <label className="text-center text-2xl font-semibold text-balance">
                        {album.name}
                    </label>

                    <ListOptions
                        type="album"
                        publicId={album.publicId}
                        allSongsInDatabase={allSongsInDatabase}
                    />
                </div>

                <div className="flex flex-wrap justify-center text-xl font-semibold text-stone-400 md:justify-start">
                    {album.artists.map((artist, index) => (
                        <span
                            className="flex items-center space-x-1"
                            key={artist.publicId}
                        >
                            <label
                                className="line-clamp-2 hover:underline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/artist/${artist.publicId}`);
                                }}
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
                        album.songs.reduce((accumulator: number, song) => {
                            return accumulator + (song.duration || 0);
                        }, 0)
                    )}{" "}
                    Minutes
                </label>
            </div>

            <div className="z-10 mt-5 flex h-full w-full flex-col px-2 md:mt-0 md:overflow-auto md:px-6">
                <div className="min-h-24"></div>

                {Object.entries(discs).map((entry) => {
                    return (
                        <div key={entry[0]}>
                            <label className="mb-2 flex flex-row items-center gap-2 text-lg font-semibold text-neutral-400">
                                <Disc className="h-6 w-6" />
                                {lang.disc} {entry[0]}
                            </label>

                            {entry[1].map((song, songIndex) => (
                                <AlbumSong
                                    key={song.publicId}
                                    song={
                                        new SongWithAlbum({
                                            ...song,
                                            album,
                                        })
                                    }
                                    index={songIndex}
                                />
                            ))}
                        </div>
                    );
                })}
                <div className="min-h-24 md:min-h-24"></div>
            </div>
        </div>
    );
}
