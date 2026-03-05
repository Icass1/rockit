"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BasePlaylistResponseSchema } from "@/dto";
import { apiFetch } from "@/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function SpotifyPlaylistClient({
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
            const playlist = await apiFetch(
                `/spotify/playlist/${spotifyId}`,
                BasePlaylistResponseSchema
            );

            router.replace(`/playlist/${playlist.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return <LoadingComponent />;
}
