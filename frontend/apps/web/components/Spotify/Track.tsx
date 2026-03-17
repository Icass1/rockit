"use client";

import { useEffect, useRef } from "react";
import { BaseSongWithoutAlbumResponseSchema } from "@/packages/dto";
import { apiFetch } from "@/packages/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function SpotifyTrackClient({
    spotifyId,
}: {
    spotifyId: string;
}) {
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        async function load() {
            await apiFetch(
                `/spotify/track/${spotifyId}`,
                BaseSongWithoutAlbumResponseSchema
            );
        }
        load();
    }, [spotifyId]);

    return <LoadingComponent />;
}
