"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BaseSongWithoutAlbumResponseSchema } from "@/dto";
import { apiFetch } from "@/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function SpotifyTrackClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const router = useRouter();

    // Reference to now if useEffect has already ran, in developer mode, useEffect are executed twice.
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        async function load() {
            const track = await apiFetch(
                `/spotify/track/${spotifyId}`,
                BaseSongWithoutAlbumResponseSchema
            );

            router.replace(`/song/${track.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return <LoadingComponent />;
}
