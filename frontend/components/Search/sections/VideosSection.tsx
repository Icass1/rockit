"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function VideosSection({
    videos,
}: {
    videos: BaseSearchResultsItem[];
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const router = useRouter();

    if (videos.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                YouTube Videos
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pl-4 md:pr-14">
                {videos.map((video) => (
                    <Link
                        href={video.url}
                        prefetch={false}
                        className="w-64 flex-none transition md:w-80 md:hover:scale-105"
                        key={video.url}
                    >
                        <Image
                            width={350}
                            height={197}
                            className="aspect-video w-full rounded-lg object-cover"
                            src={video.imageUrl}
                            alt={`Thumbnail of ${video.title}`}
                        />
                        <span className="mt-2 block truncate text-left font-semibold">
                            {video.title}
                        </span>
                        <span className="block truncate text-center text-sm text-gray-400">
                            {video.artists.map((artist, i) => (
                                <button
                                    key={artist.url}
                                    className="md:hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        router.push(artist.url);
                                    }}
                                >
                                    {artist.name}
                                    {i < video.artists.length - 1 ? ", " : ""}
                                </button>
                            ))}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
