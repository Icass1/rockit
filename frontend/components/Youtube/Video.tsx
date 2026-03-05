"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseSongWithoutAlbumResponseSchema } from "@/dto";

export default function YoutubeVideoClient({
    youtubeId,
}: {
    youtubeId: string;
}) {
    const router = useRouter();

    useEffect(() => {
        async function load() {
            const video = await fetch(`/api/youtube/video/${youtubeId}`);
            const parsedSong = BaseSongWithoutAlbumResponseSchema.parse(
                await video.json()
            );

            router.replace(`/video/${parsedSong.publicId}`);
        }
        load();
    }, [youtubeId, router]);

    return (
        <div>
            <h2>Loading Youtube Video...</h2>
            <p>Please wait, fetching data...</p>
        </div>
    );
}
