"use client";

import Image from "next/image";
import Link from "next/link";
import { YouTubeSearchVideoItem } from "@/dto";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VideosSection({ videos }: { videos: YouTubeSearchVideoItem[] }) {
    const { langFile: lang } = useLanguage();

    if (!lang || videos.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                YouTube Videos
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {videos.map((video) => (
                    <Link
                        href={`/youtube/video/${video.videoId}`}
                        prefetch={false}
                        className="w-64 flex-none transition md:w-80 md:hover:scale-105"
                        key={video.videoId}
                    >
                        <Image
                            width={350}
                            height={197}
                            className="aspect-video w-full rounded-lg object-cover"
                            src={video.thumbnailUrl || "/video-placeholder.png"}
                            alt={`Thumbnail of ${video.title}`}
                        />
                        <span className="mt-2 block truncate text-left font-semibold">
                            {video.title}
                        </span>
                        <span className="block truncate text-left text-sm text-gray-400">
                            {video.channelTitle}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
