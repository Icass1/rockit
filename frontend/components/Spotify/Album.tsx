"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseAlbumWithoutSongsResponseSchema } from "@/dto";

export default function SpotifyAlbumClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const album = await fetch(`/api/spotify/album/${spotifyId}`);
            const parsedSong = BaseAlbumWithoutSongsResponseSchema.parse(
                await album.json()
            );

            router.replace(`/album/${parsedSong.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return (
        <div>
            <h2>Loading Spotify Album...</h2>
            <p>Please wait, fetching data...</p>
        </div>
    );
}
