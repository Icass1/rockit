"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import { Stats } from "@/lib/stats";
import { lang, langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { Disc3, Heart, History } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "@/components/Image";

export function FeaturedLists({
    filterMode,
    searchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    searchQuery: string;
}) {
    const $lang = useStore(langData);
    const [data, setData] = useState<Stats["albums"]>([]);

    useEffect(() => {
        fetch("/api/stats?type=albums&sortBy=timesPlayed")
            .then((res) => res.ok && res.json())
            .then((albums) => setData(albums));
    }, []);

    if (!$lang) return false;

    // Filtrar por búsqueda (por nombre de álbum o artista)
    let filtered = data.filter((album) => {
        const nameMatch = album.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const artistMatch = album.artists?.some((artist) =>
            artist.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return nameMatch || artistMatch;
    });

    // Ordenar según filterMode (ejemplo por nombre A–Z)
    if (filterMode === "asc") {
        filtered = filtered
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    } else if (filterMode === "desc") {
        filtered = filtered
            .slice()
            .sort((a, b) => b.name.localeCompare(a.name));
    }

    const date = new Date();
    date.setMonth(date.getMonth() - 1);

    let lastMonthNameIndex = new Intl.DateTimeFormat("en", {
        month: "long",
    })
        .format(date)
        .toLowerCase();

    let lastMonthName = new Intl.DateTimeFormat(lang.get(), {
        month: "long",
    }).format(date);

    lastMonthName =
        lastMonthName[0].toLocaleUpperCase() + lastMonthName.slice(1);

    return (
        <section className="pt-5 text-white md:py-12">
            <h2 className="px-5 text-2xl font-bold md:px-0">
                {$lang.featured_lists}
            </h2>
            <div
                className="relative flex items-center gap-5 overflow-y-auto py-4 md:overflow-x-auto md:px-2"
                style={{ scrollbarGutter: "stable both-edges" }}
            >
                <Link
                    href={`/playlist/liked`}
                    className="ml-8 w-[calc(40%-10px)] flex-none transition md:ml-0 md:w-48 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <Heart
                            className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                            fill="white"
                        />
                    </div>
                    <label className="mt-2 block truncate text-center font-semibold">
                        {$lang.liked_songs}
                    </label>
                    <label className="block truncate text-center text-sm text-gray-400">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                <Link
                    href={`/playlist/most-listened`}
                    className="w-[calc(40%-10px)] flex-none transition md:w-48 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <Disc3 className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <label className="mt-2 block truncate text-center font-semibold">
                        {$lang.most_listened}
                    </label>
                    <label className="block truncate text-center text-sm text-gray-400">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                <Link
                    href={`/playlist/recent-mix`}
                    className="w-[calc(40%-10px)] flex-none transition md:w-48 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <History className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <label className="mt-2 block truncate text-center font-semibold">
                        {$lang.recent_mix}
                    </label>
                    <label className="block truncate text-center text-sm text-gray-400">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                <Link
                    href={`/playlist/last-month`}
                    className="w-[calc(40%-10px)] flex-none transition md:w-48 md:hover:scale-105"
                >
                    <div
                        className="relative aspect-square w-full rounded-lg object-cover"
                        style={{
                            backgroundImage: `url(/recap-covers/${lastMonthNameIndex}.png)`,
                            backgroundSize: "cover",
                        }}
                    >
                        <div className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    <label className="mt-2 block truncate text-center font-semibold">
                        {lastMonthName} Recap
                    </label>
                    <label className="block truncate text-center text-sm text-gray-400">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                {/* Tus álbumes filtrados/ordenados */}
                {filtered.slice(0, 4).map((album) => (
                    <Link
                        key={album.id}
                        href={`/album/${album.id}`}
                        className="library-item w-[calc(40%-10px)] flex-none transition md:w-48 md:hover:scale-105"
                    >
                        <Image
                            width={300}
                            height={300}
                            className="aspect-square w-full rounded-lg object-cover"
                            src={getImageUrl({
                                imageId: album.image,
                                height: 300,
                                width: 300,
                                placeHolder: "/song-placeholder.png",
                            })}
                            alt={album.name}
                        />
                        <label className="mt-2 block truncate text-center font-semibold">
                            {album.name}
                        </label>
                        <label className="block truncate text-center text-sm text-gray-400">
                            {album.artists.map((artist, i) => (
                                <span
                                    key={artist.id}
                                    className="md:hover:underline"
                                >
                                    {artist.name}
                                    {i < album.artists.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </label>
                    </Link>
                ))}

                <div className="min-h-1 min-w-1 text-transparent">a</div>
            </div>
        </section>
    );
}
