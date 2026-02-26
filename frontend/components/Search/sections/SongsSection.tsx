"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { SearchResponse } from "@/dto";
import { getBestImage } from "@/lib/utils/getBestImage";

export default function SongsSection({
    songs,
}: {
    songs: SearchResponse["results"][number]["items"];
}) {
    const { langFile: lang } = useLanguage();
    const router = useRouter();

    if (!lang || songs.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.songs}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {songs.map((song) => {
                    return (
                        <Link
                            href={song.url}
                            prefetch={false}
                            className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                            key={song.publicId}
                        >
                            <Image
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-lg object-cover"
                                src={song.imageUrl}
                                alt={`Cover of ${song.title}`}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {song.title}
                            </span>
                            <span className="block truncate text-center text-sm text-gray-400">
                                {song.artists.map((artist, i) => (
                                    <button
                                        key={artist.publicId}
                                        className="md:hover:underline"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            router.push(
                                                `/artist/${artist.publicId}`
                                            );
                                        }}
                                    >
                                        {artist.name}
                                        {i < song.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </button>
                                ))}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
