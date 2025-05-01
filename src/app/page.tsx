"use client";

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
    const [moodSongs, setMoodSongs] = useState<Record<Mood, SongForStats[]>>({
        relaxed: [],
        energy: [],
        focus: [],
        party: [],
    });

    const $lang = useStore(langData);

    useEffect(() => {
        fetch(
            "/api/stats?limit=20&sortBy=timePlayed&noRepeat=true&type=songs"
        ).then((response) => {
            if (response.ok) {
                response.json().then((data) => setSongsByTimePlayed(data));
            } else {
                console.warn("Error fetching songs by time played");
            }
        });
    }, []);

    useEffect(() => {
        fetch(
            "/api/stats?limit=40&sortBy=random&noRepeat=true&type=songs"
        ).then((response) => {
            if (response.ok) {
                response.json().then((data) => setRandomSongsLastMonth(data));
            } else {
                console.warn("Error fetching songs");
            }
        });
    }, []);

    useEffect(() => {
        fetch(
            "/api/stats?limit=15&sortBy=timePlayed&mixOld=true&type=songs"
        ).then((r) =>
            r.ok ? r.json().then(setNostalgicMix) : console.warn("Error")
        );
    }, []);

    useEffect(() => {
        fetch(
            "/api/stats?limit=20&sortBy=neverPlayed&noRepeat=true&type=songs"
        ).then((r) =>
            r.ok ? r.json().then(setHiddenGems) : console.warn("Error")
        );
    }, []);

    useEffect(() => {
        fetch("/api/stats?limit=20&sortBy=popular&type=songs").then((r) =>
            r.ok ? r.json().then(setCommunityTop) : console.warn("Error")
        );
    }, []);

    useEffect(() => {
        Promise.all(
            (["relaxed", "energy", "focus", "party"] as Mood[]).map((mood) =>
                fetch(`/api/stats?limit=10&filterMood=${mood}&type=songs`)
                    .then((r) => (r.ok ? r.json() : []))
                    .then((data) => ({ mood, data }))
            )
        ).then((results) => {
            const map = {} as typeof moodSongs;
            results.forEach((r) => (map[r.mood] = r.data));
            setMoodSongs(map);
        });
    }, []);

    useEffect(() => {
        const now = new Date();
        const start = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        ).toISOString();
        const end = new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        ).toISOString();
        fetch(
            `/api/stats?limit=5&sortBy=timePlayed&start=${start}&end=${end}&type=songs`
        ).then((r) =>
            r.ok ? r.json().then(setMonthlyTop) : console.warn("Error")
        );
    }, []);

    if (!$lang) return;

    return (
        <div className="relative flex h-full flex-col overflow-y-auto pt-24 pb-24">
            <SongsCarousel></SongsCarousel>

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
                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                    {$lang.quick_selections}
                </h2>
                <div className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto px-8 py-4 md:gap-4 md:px-2 md:[scrollbar-gutter:stable]">
                    {/* Aquí creamos las columnas dinámicamente */}
                    {
                        // Dividir las canciones en columnas de 4 canciones por columna
                        Array.from({ length: 10 }).map((index, columnIndex) => (
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
                        ))
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
    );
}
