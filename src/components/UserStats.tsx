import { getDate, getMinutes } from "@/lib/getTime";
import BarGraph from "./BarGraph.tsx";
import { useEffect, useRef, useState } from "react";
import type { SongForStats, Stats } from "@/lib/stats";

export default function UserStats() {
    const [startDate, setStartDate] = useState("2024-06-01");
    const [endDate, setEndDate] = useState("2024-07-01");

    const startDateInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);

    const [songsBarGraph, setSongsBarGraph] = useState<SongForStats[]>([]);

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const [data, setData] = useState<Stats>({
        songs: [],
        albums: [],
        artists: [],
    });

    useEffect(() => {
        let songsBarGraph: SongForStats[] = [];

        data.songs.map((song) => {
            let result = songsBarGraph.find(
                (findSong) => findSong.id == song.id
            );
            if (result) {
                result.timesPlayed += 1;
            } else {
                songsBarGraph.push({
                    index: 0,
                    name: song.name,
                    id: song.id,
                    timesPlayed: 1,
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
        songsBarGraph.map((song) => {
            song.index = sortedSongsBarGraph.indexOf(song);
        });
        setSongsBarGraph(songsBarGraph);
    }, [data]);

    useEffect(() => {
        fetch(
            `/api/stats?start=${new Date(startDate).getTime()}&end=${new Date(
                endDate
            ).getTime()}`
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
        let monthNumber = today.getMonth() + 1; // Months start at 0!
        let dayNumber = today.getDate();

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

    Array(Math.floor((end - start) / (3600 * 1000 * 24)) + 1)
        .fill(0)
        .map((_, index) => {
            const timeStamp = start + index * 3600 * 1000 * 24;
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

    return (
        <>
            <label className="text-lg font-semibold md:px-5 flex flex-col md:flex-row md:gap-1 justify-center items-center">
                <span className="block md:inline">
                    Showing data from
                </span>
                <span className="block md:inline">
                    <label
                        className="md:hover:underline underline"
                        onClick={() => {
                            startDateInputRef.current && startDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            ref={startDateInputRef}
                            max={endDate}
                            type="date"
                            className="absolute opacity-0"
                            value={startDate}
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }
                                setStartDate(e.target.value);
                            }}
                            required
                        />
                        {getDate(startDate)}
                    </label>{" "}
                    to{" "}
                    <label
                        className="md:hover:underline underline"
                        onClick={() => {
                            endDateInputRef.current && endDateInputRef.current.showPicker();
                        }}
                    >
                        <input
                            min={startDate}
                            max={getTodayDate()}
                            ref={endDateInputRef}
                            type="date"
                            className="absolute opacity-0"
                            value={endDate}
                            onChange={(e) => {
                                if (e.target.value === "") {
                                    return;
                                }
                                setEndDate(e.target.value);
                            }}
                        />
                        {getDate(endDate)}
                    </label>
                </span>
            </label>

            <div className="md:p-4 flex md:flex-row gap-4 flex-col py-4">
                {data.songs.length == 0 ? (
                    <div>No registered data.</div>
                ) : (
                    <>
                        <div className="w-96 bg-gray-800 rounded-lg p-2 h-fit flex flex-col font-semibold">
                            <label>{totalTimesPlayedSong} songs listened</label>
                            <label>
                                {getMinutes(totalMinutesListened)} minutes
                                listened
                            </label>
                        </div>
                        <div className="w-96 bg-gray-800 rounded-lg p-2 h-fit flex flex-col font-semibold">
                            <label className="mb-2">
                                Minutes listened per day
                            </label>
                            <div className="relative h-56">
                                <div
                                    className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-t from-[#ee1086] to-[#fb6467] rounded"
                                    style={{
                                        clipPath: `polygon(${Object.entries(
                                            minutesListenedPerDay
                                        ).map(
                                            (song) =>
                                                `${
                                                    ((new Date(
                                                        song[0]
                                                    ).getTime() -
                                                        start) /
                                                        (end - start)) *
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
                                            className="bg-gray-600/50 absolute w-[1px] h-full"
                                            style={{ left: `${index * 10}%` }}
                                        />
                                    ))}
                                {Array(11)
                                    .fill(0)
                                    .map((_, index) => (
                                        <div
                                            className="bg-gray-600/50 absolute h-[1px] w-full"
                                            style={{ top: `${index * 10}%` }}
                                        />
                                    ))}
                            </div>
                        </div>

                        <BarGraph
                            name="Most listened albums"
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
                            name="Most listened artists"
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
                            name="Most listened songs"
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
