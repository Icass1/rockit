"use client";

import { Suspense } from "react";
import QuickSelectionsSong from "@/components/Home/QuickSelectionsSong";
import RecentlyPlayedSong from "@/components/Home/RecentlyPlayedSong";
import SongsCarousel from "@/components/Home/SongsCarousel";
import { SongForStats, SongWithTimePlayed } from "@/lib/stats";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";

export default function Home() {
    const [songsByTimePlayed, setSongsByTimePlayed] = useState<
        SongWithTimePlayed[]
    >([]);
    const [randomSongsLastMonth, setRandomSongsLastMonth] = useState<
        SongForStats[]
    >([]);
    const [nostalgicMix, setNostalgicMix] = useState<SongForStats[]>([]);
    const [hiddenGems, setHiddenGems] = useState<SongForStats[]>([]);
    const [communityTop, setCommunityTop] = useState<SongForStats[]>([]);
    const [monthlyTop, setMonthlyTop] = useState<SongWithTimePlayed[]>([]);
    const [moodSongs, setMoodSongs] = useState<Record<Mood, SongForStats[]>>({
        relaxed: [],
        energy: [],
        focus: [],
        party: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    const $lang = useStore(langData);

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

    type Mood = "relaxed" | "energy" | "focus" | "party";

    useEffect(() => {
        if (!$lang) return;

        const fetchData = async () => {
            try {
                const [
                    timePlayedRes,
                    randomRes,
                    nostalgicRes,
                    gemsRes,
                    communityRes,
                    moodsRes,
                    monthlyRes,
                ] = await Promise.all([
                    fetch(
                        "/api/stats?limit=20&sortBy=timePlayed&noRepeat=true&type=songs"
                    ),
                    fetch(
                        `/api/stats?limit=40&sortBy=random&noRepeat=true&type=songs&start=${new Date().getTime() - 1000 * 60 * 60 * 24 * 30}`
                    ),
                    fetch(
                        "/api/stats?limit=15&sortBy=timePlayed&mixOld=true&type=songs&noRepeat=true"
                    ),
                    fetch(
                        "/api/stats?limit=20&sortBy=neverPlayed&noRepeat=true&type=songs"
                    ),
                    fetch(
                        "/api/stats?limit=20&sortBy=popular&type=songs&noRepeat=true"
                    ),
                    Promise.all(
                        (["relaxed", "energy", "focus", "party"] as Mood[]).map(
                            (mood) =>
                                fetch(
                                    `/api/stats?limit=10&noRepeat=true&filterMood=${mood}&type=songs`
                                )
                                    .then((r) => (r.ok ? r.json() : []))
                                    .then((data) => ({ mood, data }))
                        )
                    ),
                    fetch(
                        `/api/stats?limit=5&sortBy=timesPlayed&noRepeat=true&start=${new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() - 1,
                            1
                        ).toISOString()}&end=${new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            0
                        ).toISOString()}&type=songs`
                    ),
                ]);

                if (timePlayedRes.ok)
                    setSongsByTimePlayed(await timePlayedRes.json());
                if (randomRes.ok)
                    setRandomSongsLastMonth(await randomRes.json());
                if (nostalgicRes.ok) setNostalgicMix(await nostalgicRes.json());
                if (gemsRes.ok) setHiddenGems(await gemsRes.json());
                if (communityRes.ok) setCommunityTop(await communityRes.json());

                const moodMap = {} as typeof moodSongs;
                moodsRes.forEach((r) => (moodMap[r.mood] = r.data));
                setMoodSongs(moodMap);

                if (monthlyRes.ok) setMonthlyTop(await monthlyRes.json());
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [$lang]);

    if (!$lang || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading...
            </div>
        );
    }

    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    Loading...
                </div>
            }
        >
            <div className="relative flex h-full flex-col overflow-y-auto pt-24 pb-24">
                {/* Rest of your component remains the same */}
                <SongsCarousel />

                <section className="py-5 text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang.songsforyou}
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {nostalgicMix.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
                                song={song}
                                songs={nostalgicMix}
                            />
                        ))}
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
                                        {
                                            // Asignar las canciones a cada columna
                                            randomSongsLastMonth
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
                                                            song.id
                                                        }
                                                        song={song}
                                                        songs={randomSongsLastMonth.slice(
                                                            0,
                                                            8 * 4 + 4
                                                        )}
                                                    />
                                                ))
                                        }
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
                        {songsByTimePlayed.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
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
                        {hiddenGems.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
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
                        {communityTop.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
                                song={song}
                                songs={communityTop}
                            />
                        ))}
                    </div>
                </section>

                {(Object.keys(moodSongs) as Mood[]).map((mood) => (
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
                ))}

                <section className="text-white md:py-12 md:pl-12">
                    <h2 className="px-5 text-2xl font-bold md:text-3xl">
                        {$lang[previousMonthKey]} Recap
                    </h2>
                    <div className="flex gap-4 overflow-x-auto px-10 py-4">
                        {monthlyTop.map((song) => (
                            <RecentlyPlayedSong
                                key={song.id}
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
