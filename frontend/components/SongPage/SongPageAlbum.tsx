"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BaseAlbumWithSongsResponse, BaseSongWithAlbumResponse } from "@/dto";
import { AlbumManager } from "@/lib/managers/albumManager";
import { getAlbumAsync } from "@/lib/services/mediaService";
import { getTime } from "@/lib/utils/getTime";

export default function SongPageAlbum({
    albumPublicId,
}: {
    albumPublicId: string;
}) {
    const [album, setAlbum] = useState<BaseAlbumWithSongsResponse>();

    useEffect(() => {
        getAlbumAsync(albumPublicId).then((data) => setAlbum(data));
    }, [albumPublicId]);

    if (!album) {
        return (
            <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
                <div>Loading album info...</div>
            </section>
        );
    }

    const handleSongClick = (song: BaseSongWithAlbumResponse) => {
        AlbumManager.playAlbum(
            album.songs as unknown as BaseSongWithAlbumResponse[],
            "album",
            album.publicId,
            song.publicId
        );
    };

    return (
        <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
            <h2 className="pb-4 text-center text-xl font-bold md:text-left">
                Songs from{" "}
                <Link
                    href={`/album/${album.publicId}`}
                    className="text-2xl hover:underline"
                >
                    {album.name}
                </Link>
            </h2>
            {(album.songs as unknown as BaseSongWithAlbumResponse[]).map(
                (s, idx) => (
                    <div
                        key={s.publicId}
                        className="group mt-2 flex cursor-pointer justify-between gap-4"
                        onClick={() => handleSongClick(s)}
                    >
                        <span className="font-semibold text-[#b2b2b2]">
                            {idx + 1}
                        </span>
                        <span className="flex-1 truncate font-semibold group-hover:underline">
                            {s.name}
                        </span>
                        <span className="text-[#b2b2b2]">
                            {getTime(s.duration)}
                        </span>
                    </div>
                )
            )}
        </section>
    );
}
