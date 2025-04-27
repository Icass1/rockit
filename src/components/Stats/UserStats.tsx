"use client";

import { getDate, getDateYYYYMMDD, getMinutes } from "@/lib/getTime";
import BarGraph from "./BarGraph";
import { useEffect, useRef, useState } from "react";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { UserStats as UserStatsType } from "@/app/api/stats/user-stats/route";
import pkg from "lodash";
import VerticalBarGraph from "./VerticalBarGraph";
import Masonry from "@/components/Masonry/Masonry";
import useDev from "@/hooks/useDev";
const { debounce } = pkg;

export default function UserStats() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const _start = new Date(
        today.getTime() - offset * 60 * 1000 - 6 * 24 * 60 * 60 * 1000
    );
    const _end = new Date(today.getTime() - offset * 60 * 1000);
    _start.setHours(0);
    _start.setMinutes(0);
    _start.setSeconds(0);

    _end.setHours(23);
    _end.setMinutes(59);
    _end.setSeconds(59);

    const [startDate, setStartDate] = useState(_start.toISOString());
    const [endDate, setEndDate] = useState(_end.toISOString());
    const [firstDate, setFirstDate] = useState<string | undefined>(undefined);

    const startDateInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<UserStatsType>({
        totalTimesPlayedSong: 0,
        totalSecondsListened: 0,
        minutesListenedByRange: [],
        songs: [],
        albums: [],
        artists: [],
    });

    const dev = useDev();

    const fetchDebounce =
        useRef<pkg.DebouncedFunc<(endDate: string, startDate: string) => void>>(
            null
        );

    useEffect(() => {
        fetch("/api/stats/user-stats/first-date").then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    setFirstDate(data);
                });
            }
        });
    }, []);

    useEffect(() => {
        fetchDebounce.current = debounce((endDate, startDate) => {
            fetch(
                `/api/stats/user-stats?start=${new Date(startDate)}&end=${new Date(endDate)}`
            ).then((response) => {
                if (response.ok) {
                    response.json().then((data) => {
                        setData(data);
                    });
                }
            });
        }, 1000);
    }, []);

    useEffect(() => {
        fetchDebounce.current?.(endDate, startDate);
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

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div className="h-full">
            <div className="flex flex-col items-center justify-center text-lg font-semibold md:flex-row md:gap-1 md:px-5">
                <span className="block md:inline">{$lang.showing_data}</span>
                <div className="flex flex-row gap-1">
                    <div
                        className="cursor-pointer underline md:hover:underline"
                        onClick={() => {
                            if (startDateInputRef.current)
                                startDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            min={firstDate}
                            ref={startDateInputRef}
                            max={getDateYYYYMMDD(endDate)}
                            type="date"
                            className="pointer-events-none absolute opacity-0"
                            value={
                                // new Date(startDate).toISOString().split("T")[0]
                                getDateYYYYMMDD(startDate)
                            }
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }

                                const newDate = new Date(e.target.value);
                                newDate.setHours(0);
                                newDate.setMinutes(0);
                                newDate.setSeconds(0);

                                if (
                                    newDate.getTime() >
                                    new Date(endDate).getTime()
                                )
                                    return;

                                setStartDate(newDate.toISOString());
                            }}
                            required
                        />
                        {getDate(startDate)}
                    </div>
                    <label>{$lang.to}</label>
                    <div
                        className="cursor-pointer underline md:hover:underline"
                        onClick={() => {
                            if (endDateInputRef.current)
                                endDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            min={getDateYYYYMMDD(startDate)}
                            max={getTodayDate()}
                            ref={endDateInputRef}
                            type="date"
                            className="pointer-events-none absolute opacity-0"
                            value={getDateYYYYMMDD(endDate)}
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }

                                const newDate = new Date(e.target.value);
                                newDate.setHours(23);
                                newDate.setMinutes(59);
                                newDate.setSeconds(59);
                                if (
                                    newDate.getTime() <
                                    new Date(startDate).getTime()
                                )
                                    return;

                                setEndDate(newDate.toISOString());
                            }}
                        />
                        {getDate(endDate)}
                    </div>
                </div>
                {dev && (
                    <span
                        className="text-3xl text-yellow-400"
                        onClick={() =>
                            fetch(
                                `/api/stats/user-stats?start=${new Date(startDate)}&end=${new Date(endDate)}`
                            ).then((response) => {
                                if (response.ok) {
                                    response.json().then((data) => {
                                        setData(data);
                                    });
                                }
                            })
                        }
                    >
                        [Dev] refresh
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4 py-4 md:flex-row md:p-4">
                {data.songs.length == 0 ? (
                    <div>No registered data.</div>
                ) : (
                    <Masonry gap={10} minColumnWidth={400}>
                        <div className="flex h-fit flex-col rounded-lg bg-neutral-800 p-2 font-semibold">
                            <label>
                                {data.totalTimesPlayedSong}{" "}
                                {$lang.songs_listened}
                            </label>
                            <label>
                                {getMinutes(data.totalSecondsListened)}{" "}
                                {$lang.minutes_listend}
                            </label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {getMinutes(
                                    data.totalSecondsListened /
                                        data.totalTimesPlayedSong
                                )}{" "}
                                $lang.average_minutes_per_song
                            </label>
                        </div>
                        <VerticalBarGraph
                            title="Minutes listened"
                            data={data.minutesListenedByRange}
                        />

                        <BarGraph
                            name={$lang.most_listened_albums}
                            type="value"
                            items={data.albums.map((album) => {
                                return {
                                    image: album.image,
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
                            items={data.songs.map((song) => {
                                return {
                                    image: song.image,
                                    index: song.index,
                                    id: song.id,
                                    name: song.name,
                                    value: song.timesPlayed,
                                    href: `/song/${song.id}`,
                                };
                            })}
                        />
                    </Masonry>
                )}
            </div>
        </div>
    );
}
