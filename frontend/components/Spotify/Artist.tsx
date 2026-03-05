"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseArtistResponseSchema } from "@/dto";

export default function SpotifyArtistClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const artist = await fetch(`/api/spotify/artist/${spotifyId}`);
            const parsedSong = BaseArtistResponseSchema.parse(
                await artist.json()
            );

            router.replace(`/artist/${parsedSong.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return (
        <div>
            <h2>Loading Spotify Artist...</h2>
            <p>Please wait, fetching data...</p>
        </div>
    );
}
