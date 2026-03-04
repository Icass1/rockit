"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchResults } from "@/components/Search/hooks/useSearchResults";
import SearchBarInput from "@/components/Search/SearchBarInput";
import AlbumsSection from "@/components/Search/sections/AlbumsSection";
import ArtistsSection from "@/components/Search/sections/ArtistsSection";
import PlaylistsSection from "@/components/Search/sections/PlaylistsSection";
import RadioSection from "@/components/Search/sections/RadioSection";
import SongsSection from "@/components/Search/sections/SongsSection";
import VideosSection from "@/components/Search/sections/VideosSection";

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
            <div className="md:mt-10 relative w-46 h-36">
                <Image
                    src="/logo-banner.png"
                    alt="Rockit Logo"
                    fill
                    priority
                    className="object-contain"
                    sizes="144px"
                />
            </div>
        </section>
    );
}

function SearchResults() {
    const { results, searching, query } = useSearchResults();

    if (!query) return <EmptyState />;

    if (searching && !results) {
        return (
            <div className="flex h-full items-center justify-center text-white">
                <span className="animate-pulse text-xl font-semibold">
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

    const mediaResults = results.results;

    return (
        <div className="overflow-y-auto pt-0 md:pt-24">
            <SongsSection
                songs={mediaResults.filter((item) => item.type === "song")}
            />
            <AlbumsSection
                albums={mediaResults.filter((item) => item.type === "album")}
            />
            <ArtistsSection
                artists={mediaResults.filter((item) => item.type === "artist")}
            />
            <PlaylistsSection
                playlists={mediaResults.filter(
                    (item) => item.type === "playlist"
                )}
            />
            <VideosSection
                videos={mediaResults.filter((item) => item.type === "video")}
            />
            {/* <RadioSection
                stations={mediaResults.filter((item) => item.type === "radio")}
            /> */}
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
