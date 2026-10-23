"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { LoaderCircle } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    artistPageUrl,
    rememberArtistPortrait,
    resolveArtistPageUrl,
} from "@/lib/services/artistService";
import SearchRail from "@/components/Search/SearchRail";

export default function ArtistsSection({
    artists,
}: {
    artists: BaseSearchResultsItem[];
}): JSX.Element | null {
    const router = useRouter();
    const navigation = useRef(0);
    const [pending, setPending] = useState("");
    useEffect(
        () => () => {
            navigation.current++;
        },
        []
    );
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (artists.length === 0) return null;

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.ARTISTS}
            </h2>
            <SearchRail kind="artist">
                {artists.map((artist): JSX.Element => (
                    <Link
                        key={rockIt.searchManager.getResultKey(artist)}
                        href={artistPageUrl(artist.name, artist.url)}
                        onClick={(event) => {
                            rememberArtistPortrait(
                                artist.name,
                                artist.imageUrl
                            );
                            if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey ||
                                artist.url?.startsWith("/artist/")
                            )
                                return;
                            event.preventDefault();
                            const request = ++navigation.current;
                            setPending(artist.providerUrl);
                            void resolveArtistPageUrl(
                                artist.name,
                                artist.providerUrl,
                                artist.url
                            )
                                .then((url) => {
                                    if (request === navigation.current)
                                        router.push(url);
                                })
                                .catch(() => {
                                    if (request === navigation.current)
                                        router.push(artistPageUrl(artist.name));
                                })
                                .finally(() => {
                                    if (request === navigation.current)
                                        setPending("");
                                });
                        }}
                        aria-busy={pending === artist.providerUrl}
                        className="block shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                        <div className="w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105">
                            <Image
                                sizes="(min-width: 768px) 192px, 144px"
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-full object-cover select-none"
                                src={artist.imageUrl || "/logo-banner.png"}
                                alt={artist.name}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {pending === artist.providerUrl && (
                                    <LoaderCircle
                                        size={14}
                                        className="mr-1 inline animate-spin"
                                        aria-hidden
                                    />
                                )}
                                {artist.name}
                            </span>
                        </div>
                    </Link>
                ))}
            </SearchRail>
        </section>
    );
}
