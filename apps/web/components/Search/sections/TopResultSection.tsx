"use client";

import { useEffect, useRef, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    artistPageUrl,
    rememberArtistPortrait,
    resolveArtistPageUrl,
} from "@/lib/services/artistService";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import SearchResultCard from "@/components/Search/SearchResultCard";
import SearchSongPlayButton from "@/components/Search/SearchSongPlayButton";

export default function TopResultSection({
    media,
}: {
    media: BaseSearchResultsItem;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const router = useRouter();
    const navigation = useRef(0);
    useEffect(
        () => () => {
            navigation.current++;
        },
        [media.providerUrl]
    );
    const labels = {
        song: vocabulary.SONG,
        album: vocabulary.ALBUM,
        artist: vocabulary.ARTIST,
        playlist: vocabulary.PLAYLIST,
        video: vocabulary.VIDEO,
        radio: vocabulary.RADIO,
    };
    const artwork = (
        <Image
            src={media.imageUrl?.trim() || "/logo-banner.png"}
            alt={media.name}
            width={160}
            height={160}
            sizes="(min-width: 768px) 160px, 112px"
            className={`aspect-square w-28 object-cover shadow-lg md:w-40 ${media.type === "artist" ? "rounded-full" : "rounded-xl"}`}
        />
    );
    const details = (
        <>
            <span className="text-foreground-strong block text-2xl font-bold break-words md:text-3xl">
                {media.name}
            </span>
            <span className="text-muted-foreground mt-2 block text-sm">
                {labels[media.type]}
                {media.artists.length > 0 && (
                    <>
                        {" "}
                        ·{" "}
                        {media.artists.map((artist) => artist.name).join(", ")}
                    </>
                )}
            </span>
            {Boolean(media.lyricsScore) && (
                <span className="text-primary mt-3 block text-sm font-medium">
                    {vocabulary.SEARCH_LYRICS_MATCH}
                </span>
            )}
        </>
    );
    return (
        <section className="text-foreground-strong px-5 py-4 md:py-6 md:pr-12 md:pl-12">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                {vocabulary.SEARCH_TOP_RESULT}
            </h2>
            {media.type === "artist" ? (
                <Link
                    href={artistPageUrl(media.name, media.url)}
                    onClick={(event) => {
                        rememberArtistPortrait(media.name, media.imageUrl);
                        if (
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey ||
                            media.url?.startsWith("/artist/")
                        )
                            return;
                        event.preventDefault();
                        const request = ++navigation.current;
                        void resolveArtistPageUrl(
                            media.name,
                            media.providerUrl,
                            media.url
                        )
                            .then((url) => {
                                if (request === navigation.current)
                                    router.push(url);
                            })
                            .catch(() => {
                                if (request === navigation.current)
                                    router.push(artistPageUrl(media.name));
                            });
                    }}
                    className="bg-muted/50 hover:bg-muted focus-visible:outline-foreground-strong flex max-w-xl items-center gap-5 rounded-2xl p-5 focus-visible:outline-2 md:gap-6 md:p-6"
                >
                    {artwork}
                    <div className="min-w-0">{details}</div>
                </Link>
            ) : (
                <SearchResultCard media={media} featured>
                    <div className="flex items-center gap-5 md:gap-6">
                        <div className="relative shrink-0">
                            {artwork}
                            <SearchSongPlayButton song={media} />
                        </div>
                        <div className="min-w-0 flex-1">
                            {details}
                            {media.type === "radio" && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        const id =
                                            media.publicId ??
                                            media.url?.split("/").pop();
                                        if (id)
                                            void rockIt.stationManager.playStationByPublicId(
                                                id
                                            );
                                    }}
                                    className="bg-primary text-primary-foreground focus-visible:outline-foreground-strong mt-4 min-h-11 rounded-full px-5 font-semibold focus-visible:outline-2"
                                >
                                    {vocabulary.PLAY}
                                </button>
                            )}
                        </div>
                    </div>
                </SearchResultCard>
            )}
        </section>
    );
}
