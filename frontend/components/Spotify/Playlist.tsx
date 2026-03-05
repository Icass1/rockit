"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BasePlaylistResponseSchema } from "@/dto";

export default function SpotifyPlaylistClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const playlist = await fetch(`/api/spotify/playlist/${spotifyId}`);
            const parsedSong = BasePlaylistResponseSchema.parse(
                await playlist.json()
            );

            router.replace(`/playlist/${parsedSong.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return (
        <div>
            <h2>Loading Spotify Playlist...</h2>
            <p>Please wait, fetching data...</p>
        </div>
    );
}
