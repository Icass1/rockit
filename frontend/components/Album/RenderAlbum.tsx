"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { groupBy } from "lodash";
import { Disc } from "lucide-react";
import { AlbumWithSongs } from "@/lib/rockit/albumWithSongs";
import { rockIt } from "@/lib/rockit/rockIt";
import { SongWithAlbum } from "@/lib/rockit/songWithAlbum";
import { getMinutes, getYear } from "@/lib/utils/getTime";
import { useListDownload } from "@/components/List/hooks/useListDownload";
import { ListCover } from "@/components/List/ListCover";
import ListOptions from "@/components/ListHeader/ListOptions";
import AlbumSong from "@/components/ListSongs/AlbumSong";

export default function RenderAlbum({
    albumResponse,
}: {
    albumResponse: Parameters<typeof AlbumWithSongs.fromResponse>[0];
}) {
    const { langFile: lang } = useLanguage();

    const album = AlbumWithSongs.fromResponse(albumResponse);

    useEffect(() => {
        rockIt.currentListManager.setCurrentListSongs(
            album.songs.map((song) => {
                return new SongWithAlbum({ ...song, album });
            })
        );
    }, [album]);

    const { isDownloading, downloadProgress, anyDownloaded, allDownloaded } =
        useListDownload({
            publicId: album.publicId,
            type: "album",
            songs: album.songs,
        });

    if (!lang) return false;

    const totalDuration = album.songs.reduce(
        (acc, s) => acc + (s.duration || 0),
        0
    );
    const discs = groupBy(album.songs, (song) => song.discNumber);

    return (
        <div className="relative flex h-full w-full flex-col overflow-y-auto px-2 md:grid md:grid-cols-[min-content_1fr] md:px-0">
            <div className="relative top-24 z-50 mx-4 flex h-full flex-col items-center justify-center gap-1 md:top-0 md:max-w-md">
                <ListCover
                    publicId={album.publicId}
                    type="album"
                    name={album.name}
                    imageUrl={album.internalImageUrl ?? "/song-placeholder.png"}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                    anyDownloaded={anyDownloaded}
                    allDownloaded={allDownloaded}
                    sizeClassName="h-72 md:h-[40vh]"
                />

                <div className="z-50 mx-auto flex w-fit flex-row items-center gap-2">
                    <span className="text-center text-2xl font-semibold text-balance">
                        {album.name}
                    </span>
                    <ListOptions
                        type="album"
                        publicId={album.publicId}
                        allSongsInDatabase={allDownloaded}
                    />
                </div>

                <div className="flex flex-wrap justify-center text-xl font-semibold text-stone-400 md:justify-start">
                    {album.artists.map((artist, index) => (
                        <Link
                            key={artist.publicId}
                            href={`/artist/${artist.publicId}`}
                            className="line-clamp-2 hover:underline"
                        >
                            {artist.name}
                            {index < album.artists.length - 1 && ", "}
                        </Link>
                    ))}
                </div>

                <span className="text-center text-sm text-stone-400">
                    {getYear(album.releaseDate)} | {album.songs.length} Songs |{" "}
                    {getMinutes(totalDuration)} Minutes
                </span>
            </div>

            <div className="z-10 mt-5 flex h-full w-full flex-col px-2 md:mt-0 md:overflow-auto md:px-6">
                <div className="min-h-24" />

                {Object.entries(discs).map(([disc, songs]) => (
                    <div key={disc}>
                        <span className="mb-2 flex flex-row items-center gap-2 text-lg font-semibold text-neutral-400">
                            <Disc className="h-6 w-6" />
                            {lang.disc} {disc}
                        </span>

                        {songs.map((song, songIndex) => (
                            <AlbumSong
                                key={song.publicId}
                                song={new SongWithAlbum({ ...song, album })}
                                index={songIndex}
                            />
                        ))}
                    </div>
                ))}
                <div className="min-h-24" />
            </div>
        </div>
    );
}
