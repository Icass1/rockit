"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BaseVideoResponseSchema } from "@/dto";
import { apiFetch } from "@/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function YoutubeVideoClient({
    youtubeId,
}: {
    youtubeId: string;
}) {
    const router = useRouter();

    // Reference to now if useEffect has already ran, in developer mode, useEffect are executed twice.
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        async function load() {
            const video = await apiFetch(
                `/youtube/video/${youtubeId}`,
                BaseVideoResponseSchema
            );

            router.replace(`/video/${video.publicId}`);
        }
        load();
    }, [youtubeId, router]);

    return <LoadingComponent />;
}
