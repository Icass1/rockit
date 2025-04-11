"use client";

import { getDate, getMinutes } from "@/lib/getTime";
import BarGraph from "./BarGraph";
import { useEffect, useRef, useState } from "react";
import type { SongForStats } from "@/lib/stats";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ApiStats } from "@/app/api/stats/route";

export default function UserStats() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const _start = new Date(
        today.getTime() - offset * 60 * 1000 - 7 * 24 * 60 * 60 * 1000
    );
    const _end = new Date(today.getTime() - offset * 60 * 1000);
    _start.setHours(0);
    _start.setMinutes(0);
    _start.setSeconds(0);

    _end.setHours(23);
    _end.setMinutes(59);
    _end.setSeconds(59);

    const [startDate, setStartDate] = useState(_start.getTime());
    const [endDate, setEndDate] = useState(_end.getTime());

    const startDateInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);

    const [songsBarGraph, setSongsBarGraph] = useState<SongForStats[]>([]);

    const [data, setData] = useState<ApiStats>({
        songs: [],
        albums: [],
        artists: [],
    });

    useEffect(() => {
        const songsBarGraph: SongForStats[] = [];

        data.songs.forEach((song) => {
            const result = songsBarGraph.find(
                (findSong) => findSong.id == song.id
            );
            if (result) {
                result.timesPlayed += 1;
            } else {
                songsBarGraph.push({
                    index: 0,
                    name: song.name,
                    id: song.id,
                    timesPlayed: song.timesPlayed ?? 0,
                    albumId: song.albumId,
                    albumName: song.albumName,
                    duration: song.duration,
                    images: song.images,
                    artists: song.artists,
                    image: song.image,
                });
            }
        });

        const sortedSongsBarGraph = songsBarGraph.toSorted(
            (a, b) => b.timesPlayed - a.timesPlayed
        );
        songsBarGraph.forEach((song) => {
            song.index = sortedSongsBarGraph.indexOf(song);
        });
        setSongsBarGraph(songsBarGraph);
    }, [data]);

    useEffect(() => {
        fetch(
            `/api/stats?start=${new Date(startDate)}&end=${new Date(endDate)}&sortBy=timesPlayed&limit=20&noRepeat=true`
        ).then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    setData(data);
                });
            }
        });
    }, [startDate, endDate]);

    const getTodayDate = () => {
        const today = new Date();
        const yearNumber = today.getFullYear();
        const monthNumber = today.getMonth() + 1; // Months start at 0!
        const dayNumber = today.getDate();

        let dayString: string = dayNumber.toString();
        let monthString: string = monthNumber.toString();

        if (dayNumber < 10) dayString = "0" + dayNumber;
        if (monthNumber < 10) monthString = "0" + monthNumber;

        return yearNumber + "-" + monthString + "-" + dayString;
    };

    const totalTimesPlayedSong = data.songs.length;
    const totalMinutesListened = data.songs.reduce(
        (partialSum, a) => partialSum + a.duration,
        0
    );

    const minutesListenedPerDay: { [key: string]: number } = {};

    Array(Math.floor((endDate - startDate) / (3600 * 1000 * 24)) + 1)
        .fill(0)
        .map((_, index) => {
            const timeStamp = startDate + index * 3600 * 1000 * 24;
            const date = new Date(timeStamp);
            const datePlayed = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            minutesListenedPerDay[datePlayed] = 0;
        });

    data.songs.map((song) => {
        const date = new Date(song.timePlayed);
        const datePlayed = `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        minutesListenedPerDay[datePlayed] += song.duration;
    });

    const maxMinutesListenedInADay = Math.max(
        ...Object.values(minutesListenedPerDay)
    );

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <>
            <label className="flex flex-col items-center justify-center text-lg font-semibold md:flex-row md:gap-1 md:px-5">
                <span className="block md:inline">{$lang.showing_data}</span>
                <span className="block md:inline">
                    <label
                        className="underline md:hover:underline"
                        onClick={() => {
                            if (startDateInputRef.current)
                                startDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            ref={startDateInputRef}
                            max={endDate}
                            type="date"
                            className="absolute opacity-0"
                            value={
                                new Date(startDate).toISOString().split("T")[0]
                            }
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }
                                const newDate = new Date(e.target.value);
                                newDate.setHours(0);
                                newDate.setMinutes(0);
                                newDate.setSeconds(0);

                                if (newDate.getTime() > endDate) return;

                                setStartDate(newDate.getTime());
                            }}
                            required
                        />
                        {getDate(startDate)}
                    </label>{" "}
                    {$lang.to}{" "}
                    <label
                        className="underline md:hover:underline"
                        onClick={() => {
                            if (endDateInputRef.current)
                                endDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            min={startDate}
                            max={getTodayDate()}
                            ref={endDateInputRef}
                            type="date"
                            className="absolute opacity-0"
                            value={
                                new Date(endDate).toISOString().split("T")[0]
                            }
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }

                                const newDate = new Date(e.target.value);
                                newDate.setHours(23);
                                newDate.setMinutes(59);
                                newDate.setSeconds(59);
                                if (newDate.getTime() < startDate) return;

                                setEndDate(newDate.getTime());
                            }}
                        />
                        {getDate(endDate)}
                    </label>
                </span>
            </label>

            <div className="flex flex-col gap-4 py-4 md:flex-row md:p-4">
                {data.songs.length == 0 ? (
                    <div>No registered data.</div>
                ) : (
                    <>
                        <div className="flex h-fit flex-col rounded-lg bg-neutral-800 p-2 font-semibold md:w-96">
                            <label>
                                {totalTimesPlayedSong} {$lang.songs_listened}
                            </label>
                            <label>
                                {getMinutes(totalMinutesListened)}{" "}
                                {$lang.minutes_listend}
                            </label>
                        </div>
                        <div className="flex h-fit flex-col rounded-lg bg-neutral-800 p-2 font-semibold md:w-96">
                            <label className="mb-2">
                                {$lang.minutes_listened_per_day}
                            </label>
                            <div className="relative h-56">
                                <div
                                    className="absolute top-0 right-0 bottom-0 left-0 rounded bg-gradient-to-t from-[#ee1086] to-[#fb6467]"
                                    style={{
                                        clipPath: `polygon(${Object.entries(
                                            minutesListenedPerDay
                                        ).map(
                                            (song) =>
                                                `${
                                                    ((new Date(
                                                        song[0]
                                                    ).getTime() -
                                                        startDate) /
                                                        (endDate - startDate)) *
                                                    100
                                                }% ${
                                                    100 -
                                                    (song[1] /
                                                        maxMinutesListenedInADay) *
                                                        100
                                                }%`
                                        )}, 100% 100%, 0% 100%)`,
                                    }}
                                />
                                {Array(11)
                                    .fill(0)
                                    .map((_, index) => (
                                        <div
                                            key={"vertical" + index}
                                            className="absolute h-full w-[1px] bg-neutral-600/50"
                                            style={{ left: `${index * 10}%` }}
                                        />
                                    ))}
                                {Array(11)
                                    .fill(0)
                                    .map((_, index) => (
                                        <div
                                            key={"horizontal" + index}
                                            className="absolute h-[1px] w-full bg-neutral-600/50"
                                            style={{ top: `${index * 10}%` }}
                                        />
                                    ))}
                            </div>
                        </div>

                        <BarGraph
                            name={$lang.most_listened_albums}
                            items={data.albums.map((album) => {
                                return {
                                    index: album.index,
                                    id: album.id,
                                    name: album.name,
                                    value: album.timesPlayed,
                                    href: `/album/${album.id}`,
                                };
                            })}
                        />
                        <BarGraph
                            name={$lang.most_listened_artists}
                            items={data.artists.map((artist) => {
                                return {
                                    index: artist.index,
                                    id: artist.id,
                                    name: artist.name,
                                    value: artist.timesPlayed,
                                    href: `/artist/${artist.id}`,
                                };
                            })}
                        />
                        <BarGraph
                            name={$lang.most_listened_songs}
                            type="value"
                            items={songsBarGraph.map((song) => {
                                return {
                                    index: song.index,
                                    id: song.id,
                                    name: song.name,
                                    value: song.timesPlayed,
                                    href: `/song/${song.id}`,
                                };
                            })}
                        />
                    </>
                )}
            </div>
        </>
    );
}
