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

    const $lang = useStore(langData);

    useEffect(() => {
        fetch("/api/stats?limit=20&sortBy=timePlayed&noRepeat=true").then(
            (response) => {
                if (response.ok) {
                    response.json().then((data) => setSongsByTimePlayed(data));
                } else {
                    console.warn("Error fetching songs by time played");
                }
            }
        );
    }, []);

    useEffect(() => {
        fetch("/api/stats?limit=40&sortBy=random&noRepeat=true").then(
            (response) => {
                if (response.ok) {
                    response
                        .json()
                        .then((data) => setRandomSongsLastMonth(data));
                } else {
                    console.warn("Error fetching songs");
                }
            }
        );
    }, []);

    if (!$lang) return;

    return (
        <div className="relative flex h-full flex-col overflow-y-auto pt-24 pb-24">
            <SongsCarousel></SongsCarousel>

            <section className="py-5 text-white md:px-12 md:py-12">
                <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                    {$lang.recent_played}
                </h2>
                <div
                    className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:px-2"
                    style={{ scrollbarGutter: "stable both" }}
                >
                    {songsByTimePlayed.slice(0, 20).map((song) => (
                        <RecentlyPlayedSong
                            key={song.id}
                            song={song}
                            songs={songsByTimePlayed.slice(0, 20)}
                        />
                    ))}
                </div>
            </section>
            <section className="group text-white md:px-12">
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
        </div>
    );
}
