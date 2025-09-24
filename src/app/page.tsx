"use client";

import { Suspense, useEffect, useState } from "react";
import QuickSelectionsSong from "@/components/Home/QuickSelectionsSong";
import RecentlyPlayedSong from "@/components/Home/RecentlyPlayedSong";
import SongsCarousel from "@/components/Home/SongsCarousel";
import { useStore } from "@nanostores/react";
import Spinner from "@/components/Spinner";
import useFetch from "@/hooks/useFetch";
import { useSession } from "next-auth/react";
import { HomeStats } from "@/responses/stats/homeStatsResponse";
import { rockitIt } from "@/lib/rockit";

export default function Home() {
    const [data] = useFetch("/stats/home", HomeStats);

    const $lang = useStore(rockitIt.languageManager.langDataAtom);

    const monthKeys = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    ] as const;
    const previousMonthIndex = (new Date().getMonth() + 11) % 12;
    const previousMonthKey = monthKeys[previousMonthIndex];

    const session = useSession();

    if (session.status == "unauthenticated") {
        console.warn("Home -> /login");
        location.href = "/login";
    }

    console.warn({ data, $lang }); // <- Hydratation error here.

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return null; // or a lightweight loader
    }

    if (!$lang) {
        return (
            <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
                <label>Fatal error, unable to get language.</label>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
                <Spinner></Spinner>
                <label>Loading...</label>
            </div>
        );
    }

    const {
        songsByTimePlayed,
        randomSongsLastMonth,
        hiddenGems,
        communityTop,
        monthlyTop,
        // moodSongs,
    } = data;

    return (
        <Suspense
            fallback={
                <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
                    <Spinner></Spinner>
                    <label>Loading...</label>
                </div>
            }
        >
            <div className="relative flex h-full flex-col overflow-y-auto pt-24 pb-24">
                {/* Rest of your component remains the same */}
                <SongsCarousel />

                <section className="py-5 text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.songsforyou}
                        {/* Canciones mas escuchadas de los ultimos 7 dias + recomendaciones */}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {/* {nostalgicMix?.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
                                song={song}
                                songs={nostalgicMix}
                            />
                        ))} */}
                    </div>
                </section>

                <section className="group text-white md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.quick_selections}
                    </h2>
                    <div className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto px-8 py-4 md:gap-4 md:px-2 md:[scrollbar-gutter:stable]">
                        {/* Aquí creamos las columnas dinámicamente */}
                        {
                            // Dividir las canciones en columnas de 4 canciones por columna
                            Array.from({ length: 10 }).map(
                                (index, columnIndex) => (
                                    <div
                                        className="flex w-[51%] max-w-[200px] flex-none snap-center flex-col gap-1 md:w-[calc(25%-10px)] md:max-w-[350px]"
                                        key={columnIndex + "_" + index}
                                    >
                                        {randomSongsLastMonth
                                            .slice(
                                                columnIndex * 4,
                                                columnIndex * 4 + 4
                                            )
                                            .map((song) => (
                                                <QuickSelectionsSong
                                                    key={
                                                        columnIndex +
                                                        "_" +
                                                        index +
                                                        song.publicId
                                                    }
                                                    song={song}
                                                    songs={randomSongsLastMonth.slice(
                                                        0,
                                                        8 * 4 + 4
                                                    )}
                                                />
                                            ))}
                                    </div>
                                )
                            )
                        }
                    </div>
                </section>

                <section className="py-5 text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.recent_played}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {songsByTimePlayed?.map((song) => (
                            <RecentlyPlayedSong
                                key={song.publicId}
                                song={song}
                                songs={songsByTimePlayed}
                            />
                        ))}
                    </div>
                </section>

                <section className="text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.hiddengems}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {/* Most listened songs from one year ago to 3 months ago */}
                        {hiddenGems?.map((song) => (
                            <RecentlyPlayedSong
                                key={song.publicId}
                                song={song}
                                songs={hiddenGems}
                            />
                        ))}
                    </div>
                </section>

                <section className="py-5 text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.communitytop}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {/* Most listened songs by all RockIt users */}
                        {communityTop?.map((song) => (
                            <RecentlyPlayedSong
                                key={song.publicId}
                                song={song}
                                songs={communityTop}
                            />
                        ))}
                    </div>
                </section>

                {/* {(Object.keys(moodSongs) as Mood[]).map((mood) => (
                    <section key={mood} className="py-5 text-white md:pl-12">
                        <h2 className="px-5 text-2xl font-bold md:text-3xl">
                            {$lang.moodsongs} {$lang[`${mood}`]}
                        </h2>
                        <div className="flex gap-4 overflow-x-auto px-10 py-4">
                            {moodSongs[mood].map((song) => (
                                <RecentlyPlayedSong
                                    key={song.id}
                                    song={song}
                                    songs={moodSongs[mood]}
                                />
                            ))}
                        </div>
                    </section>
                ))} */}

                <section className="text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang[previousMonthKey]} Recap
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {/* Most listened songs from last month */}
                        {monthlyTop?.map((song) => (
                            <RecentlyPlayedSong
                                key={song.publicId}
                                song={song}
                                songs={monthlyTop}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </Suspense>
    );
}
