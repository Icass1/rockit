"use client";

import { useEffect, useRef } from "react";
import { BaseVideoResponseSchema } from "@/dto";
import { apiFetch } from "@/lib/utils/apiFetch";
import LoadingComponent from "@/components/Loading";

export default function YoutubeVideoClient({
    youtubeId,
}: {
    youtubeId: string;
}) {
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        async function load() {
            await apiFetch(
                `/youtube/video/${youtubeId}`,
                BaseVideoResponseSchema
            );
        }
        load();
    }, [youtubeId]);

    return <LoadingComponent />;
}
