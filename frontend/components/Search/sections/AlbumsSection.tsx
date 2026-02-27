"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseSearchResultsItem } from "@/dto/baseSearchResultsItem";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AlbumsSection({
    albums,
}: {
    albums: BaseSearchResultsItem[];
}) {
    const { langFile: lang } = useLanguage();
    const router = useRouter();

    if (!lang || albums.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {lang.albums}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {albums.map((album) => {
                    return (
                        <Link
                            href={album.url}
                            prefetch={false}
                            className="w-36 flex-none transition md:w-48 md:hover:scale-105"
                            key={album.url}
                        >
                            <Image
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-lg object-cover"
                                src={album.imageUrl}
                                alt={`Cover of ${album.title}`}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {album.title}
                            </span>
                            <span className="block truncate text-center text-sm text-gray-400">
                                {album.artists.map((artist, i) => (
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
                                        {i < album.artists.length - 1
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
