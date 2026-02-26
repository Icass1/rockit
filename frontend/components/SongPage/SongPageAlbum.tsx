"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlbumWithSongs } from "@/lib/rockit/albumWithSongs";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

export default function SongPageAlbum({
    albumPublicId,
}: {
    albumPublicId: string;
}) {
    const [album, setAlbum] = useState<AlbumWithSongs>();

    useEffect(() => {
        rockIt.albumManager
            .getSpotifyAlbumAsync(albumPublicId)
            .then((data) => setAlbum(AlbumWithSongs.fromResponse(data)));
    }, [albumPublicId]);

    if (!album) {
        return (
            <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
                <div>Loading album info...</div>
            </section>
        );
    }
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
            {album.songs.map((s, idx) => (
                <Link
                    key={s.publicId}
                    href={`/song/${s.publicId}`}
                    className="group mt-2 flex justify-between gap-4"
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
                </Link>
            ))}
        </section>
    );
}
