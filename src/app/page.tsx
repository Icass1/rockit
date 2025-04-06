"use client";

import QuickSelectionsSong from "@/components/Home/QuickSelectionsSong";
import RecentlyPlayedSong from "@/components/Home/RecentlyPlayedSong";
import SongsCarousel from "@/components/Home/SongsCarousel";
import { downloadResources } from "@/lib/downloadResources";
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
        <div className="relative h-full flex flex-col pb-24 pt-24 overflow-y-auto">
            <button
                className="p-2 bg-green-300 text-green-700 rounded text-3xl font-bold w-fit mt-4 mx-auto"
                onClick={async () => {
                    await downloadResources({ resources: ["/"] });
                }}
            >
                Download
            </button>

            <SongsCarousel></SongsCarousel>

            <section className="md:px-12 py-5 md:py-12 text-white">
                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                    {$lang.recent_played}
                </h2>
                <div
                    className="relative flex items-center gap-4 overflow-x-auto py-4 px-8 md:px-2"
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
            <section className="group md:px-12 text-white">
                <h2 className="text-2xl md:text-3xl font-bold text-left px-5 md:px-0">
                    {$lang.quick_selections}
                </h2>
                <div className="flex md:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-8 md:px-2 md:[scrollbar-gutter:stable]">
                    {/* Aquí creamos las columnas dinámicamente */}
                    {
                        // Dividir las canciones en columnas de 4 canciones por columna
                        Array.from({ length: 10 }).map((index, columnIndex) => (
                            <div
                                className="flex flex-col gap-1 flex-none w-[51%] max-w-[200px] md:w-[calc(25%-10px)] md:max-w-[350px] snap-center"
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
