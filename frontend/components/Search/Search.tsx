"use client";

import Image from "next/image";
import SearchBarInput from "./SearchBarInput";
import SongsSection from "./sections/SongsSection";
import AlbumsSection from "./sections/AlbumsSection";
import { useSearchResults } from "./hooks/useSearchResults";
import { useLanguage } from "@/contexts/LanguageContext";

function EmptyState() {
    const { langFile: lang } = useLanguage();
    if (!lang) return null;

    return (
        <section className="flex flex-col items-center justify-center px-7 py-36 text-center text-white md:pl-12">
            <h2 className="text-2xl font-bold md:text-3xl">
                {lang.search_empty1}
            </h2>
            <p className="mt-10 text-lg md:mt-2 md:text-xl">
                {lang.search_empty2}
            </p>
            <Image
                width={144}
                height={144}
                className="mt-10 w-36"
                src="/logo-banner.png"
                alt="Rockit Logo"
            />
        </section>
    );
}

function SearchResults() {
    const { results, searching, query } = useSearchResults();

    if (!query) return <EmptyState />;

    if (searching) {
        return (
            <div className="flex h-full items-center justify-center text-white">
                <span className="animate-pulse text-lg font-semibold">
                    Searching...
                </span>
            </div>
        );
    }

    if (!results?.spotifyResults) {
        return (
            <p className="mx-10 block text-center text-sm font-bold text-red-500">
                It seems there was an error searching your music.
            </p>
        );
    }

    return (
        <div className="overflow-y-auto pt-0 md:pt-24">
            <SongsSection songs={results.spotifyResults.songs} />
            <AlbumsSection albums={results.spotifyResults.albums} />
        </div>
    );
}

export default function Search() {
    return (
        <>
            <section className="mt-20 block h-28 px-5 md:hidden">
                <SearchBarInput />
            </section>
            <SearchResults />
        </>
    );
}
