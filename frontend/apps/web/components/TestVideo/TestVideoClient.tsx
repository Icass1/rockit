"use client";

import { BACKEND_URL } from "@/environment";

export default function TestVideoClient({
    youtubeVideoId,
}: {
    youtubeVideoId: string;
}) {
    const videoUrl = `${BACKEND_URL}/youtube/video/${youtubeVideoId}/stream`;

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
            <h1 className="mb-4 text-2xl font-bold">YouTube Video Test</h1>
            <p className="mb-4 text-gray-400">Video ID: {youtubeVideoId}</p>
            <video
                controls
                className="max-h-[80vh] w-full max-w-4xl rounded-lg"
                src={videoUrl}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
