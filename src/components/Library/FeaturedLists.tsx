"use client";

import { getImageUrl } from "@/lib/getImageUrl";
import { Stats } from "@/lib/stats";
import { lang, langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { Disc3, Heart, History } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "@/components/Image";

export function FeaturedLists() {
    const $lang = useStore(langData);

    const [data, setData] = useState<Stats["albums"]>([]);

    useEffect(() => {
        fetch("/api/stats?type=albums&sortBy=timesPlayed").then((response) => {
            if (response.ok) {
                response.json().then((data) => setData(data));
            }
        });
    }, []);

    const date = new Date();
    date.setMonth(date.getMonth() - 1);

    let lastMonthName = new Intl.DateTimeFormat(lang.get(), {
        month: "long",
    }).format(date);

    lastMonthName =
        lastMonthName[0].toLocaleUpperCase() + lastMonthName.slice(1);

    if (!$lang) return;

    return (
        <section className="pt-5 md:py-12 text-white">
            <h2 className="text-2xl font-bold text-left px-5 md:px-0">
                $lang.featured_lists
            </h2>
            <div
                className="relative flex items-center gap-5 overflow-y-auto md:overflow-x-auto py-4 md:px-2"
                style={{ scrollbarGutter: "stable both-edges" }}
            >
                <Link
                    href={`/playlist/liked`}
                    className="flex-none w-[calc(40%-10px)] md:w-48 md:hover:scale-105 transition ml-8 md:ml-0"
                >
                    <div
                        className="relative rounded-lg w-full aspect-square object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <Heart
                            className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            fill="white"
                        />
                    </div>
                    <label className="truncate font-semibold text-center block mt-2">
                        {$lang.liked_songs}
                    </label>
                    <label className="truncate text-sm text-center text-gray-400 block">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                <Link
                    href={`/playlist/most-listened`}
                    className="flex-none w-[calc(40%-10px)] md:w-48 md:hover:scale-105 transition"
                >
                    <div
                        className="relative rounded-lg w-full aspect-square object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <Disc3 className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <label className="truncate font-semibold text-center block mt-2">
                        {$lang.most_listened}
                    </label>
                    <label className="truncate text-sm text-center text-gray-400 block">
                        {$lang.by} Rock It!
                    </label>
                </Link>

                <Link
                    href={`/playlist/recent-mix`}
                    className="flex-none w-[calc(40%-10px)] md:w-48 md:hover:scale-105 transition"
                >
                    <div
                        className="relative rounded-lg w-full aspect-square object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <History className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <label className="truncate font-semibold text-center block mt-2">
                        {$lang.recent_mix}
                    </label>
                    <label className="truncate text-sm text-center text-gray-400 block">
                        {$lang.by} Rock It!
                    </label>
                </Link>
                <Link
                    href={`/playlist/last-month`}
                    className="flex-none w-[calc(40%-10px)] md:w-48 md:hover:scale-105 transition"
                >
                    <div
                        className="relative rounded-lg w-full aspect-square object-cover"
                        style={{
                            backgroundImage: "url(/rockit-background.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <div className="w-1/2 h-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    <label className="truncate font-semibold text-center block mt-2">
                        {lastMonthName} ReCap
                    </label>
                    <label className="truncate text-sm text-center text-gray-400 block">
                        {$lang.by} Rock It!
                    </label>
                </Link>
                {data.slice(0, 4).map((album) => (
                    <Link
                        key={album.id}
                        href={`/album/${album.id}`}
                        className="library-item flex-none w-[calc(40%-10px)] md:w-48 md:hover:scale-105 transition"
                    >
                        <Image
                            width={300}
                            height={300}
                            className="rounded-lg w-full aspect-square object-cover"
                            src={getImageUrl({
                                imageId: album.image,
                                height: 300,
                                width: 300,
                                placeHolder: "/song-placeholder.png",
                            })}
                            alt="Song Cover"
                        />
                        <label className="truncate font-semibold text-center block mt-2">
                            {album.name}
                        </label>
                        <label className="truncate text-sm text-center text-gray-400 block">
                            {album.artists.map((artist, index) => (
                                <label
                                    key={album.id + artist.id}
                                    className="md:hover:underline"
                                    // onclick={`event.preventDefault(); event.stopPropagation(); location.href='/artist/${artist.id}' `}
                                >
                                    {`${artist.name}${
                                        index < album.artists.length - 1
                                            ? ","
                                            : ""
                                    }`}
                                </label>
                            ))}
                        </label>
                    </Link>
                ))}
                <a className="min-w-1 min-h-1 text-transparent">a</a>
            </div>
        </section>
    );
}
