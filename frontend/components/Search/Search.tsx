"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchResults } from "@/components/Search/hooks/useSearchResults";
import SearchBarInput from "@/components/Search/SearchBarInput";
import AlbumsSection from "@/components/Search/sections/AlbumsSection";
import SongsSection from "@/components/Search/sections/SongsSection";

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

    if (!results?.results) {
        return (
            <p className="mx-10 block text-center text-sm font-bold text-red-500">
                It seems there was an error searching your music.
            </p>
        );
    }

    return (
        <div className="overflow-y-auto pt-0 md:pt-24">
            <SongsSection songs={results.results.filter(item => item.type === "song")} />
            <AlbumsSection albums={results.results.filter(item => item.type === "album")} />
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
