"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BaseArtistResponseSchema } from "@/packages/dto";
import { apiFetch } from "@/packages/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function SpotifyArtistClient({
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
            const artist = await apiFetch(
                `/spotify/artist/${spotifyId}`,
                BaseArtistResponseSchema
            );

            router.replace(`/artist/${artist.publicId}`);
        }
        load();
    }, [spotifyId, router]);

    return <LoadingComponent />;
}
