"use client";

import Image from "next/image";
import Link from "next/link";
import { BaseSearchResultsItem } from "@/dto";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ArtistsSection({
    artists,
}: {
    artists: BaseSearchResultsItem[];
}) {
    const { langFile: lang } = useLanguage();

    if (!lang || artists.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.artists}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pl-4 md:pr-14">
                {artists.map((artist) => (
                    <Link
                        href={artist.url}
                        prefetch={false}
                        className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                        key={artist.url}
                    >
                        <Image
                            width={350}
                            height={350}
                            className="aspect-square w-full rounded-full object-cover"
                            src={artist.imageUrl || "/user-placeholder.png"}
                            alt={`Image of ${artist.title}`}
                        />
                        <span className="mt-2 block truncate text-center font-semibold">
                            {artist.title}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
