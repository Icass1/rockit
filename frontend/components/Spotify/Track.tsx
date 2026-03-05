"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseSongWithoutAlbumResponseSchema } from "@/dto";

export default function SpotifyTrackClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const track = await fetch(`/api/spotify/track/${spotifyId}`);
            const parsedSong = BaseSongWithoutAlbumResponseSchema.parse(
                await track.json()
            );

            router.replace(`/song/${parsedSong.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return (
        <div>
            <h2>Loading Spotify Track...</h2>
            <p>Please wait, fetching data...</p>
        </div>
    );
}
