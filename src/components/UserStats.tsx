import { getDate } from "@/lib/getTime";
import BarGraph from "./BarGraph.tsx";
import { useEffect, useRef, useState } from "react";
import type { SongForStats, Stats } from "@/lib/stats";

export default function UserStats() {
    const [startDate, setStartDate] = useState("2024-06-01");
    const [endDate, setEndDate] = useState("2024-07-01");

    const startDateInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);

    const [songsBarGraph, setSongsBarGraph] = useState<SongForStats[]>([]);

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

    return (
        <>
            <label className="text-2xl font-semibold px-5">
                Showing data from{" "}
                <label
                    className="hover:underline"
                    onClick={() => {
                        startDateInputRef.current &&
                            startDateInputRef.current.showPicker();
                    }}
                >
                    <input
                        ref={startDateInputRef}
                        max={endDate}
                        type="date"
                        className="absolute opacity-0"
                        value={startDate}
                        onChange={(e) => {
                            if (e.target.value == "") {
                                return;
                            }
                            setStartDate(e.target.value);
                        }}
                        required={true}
                    />
                    {getDate(startDate)}
                </label>{" "}
                to{" "}
                <label
                    className="hover:underline"
                    onClick={() => {
                        endDateInputRef.current &&
                            endDateInputRef.current.showPicker();
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
                            if (e.target.value == "") {
                                return;
                            }
                            setEndDate(e.target.value);
                        }}
                    />

                    {getDate(endDate)}
                </label>
            </label>
            <div className="p-4 flex flex-row gap-4">
                {data.songs.length == 0 ? (
                    <div>No registered data.</div>
                ) : (
                    <>
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
