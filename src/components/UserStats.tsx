import { getMinutes, getDate } from "@/lib/getTime";
import BarGraph from "./BarGraph.tsx";
import { useEffect, useState } from "react";
import type { Stats } from "@/lib/stats";
import type { SongDB } from "@/lib/db";

interface SongForStats extends SongDB<"id" | "name"> {
    timesPlayed: number;
    index: number;
}

export default function UserStats() {
    const [start, setStart] = useState(new Date("2024-07-01").getTime());
    const [end, setEnd] = useState(new Date("2024-08-01").getTime());
    // const [start, setStart] = useState(1);
    // const [end, setEnd] = useState(2);

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
        fetch(`/api/stats?start=${start}&end=${end}`).then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    setData(data);
                });
            }
        });
    }, [start, end]);

    return (
        <>
            <input
                type="range"
                value={start}
                onChange={(e) => {
                    setStart(Number(e.target.value));
                }}
                min={new Date("2024-07-01").getTime()}
                max={new Date("2025-01-01").getTime()}
            ></input>
            <input
                type="range"
                value={end}
                onChange={(e) => {
                    setEnd(Number(e.target.value));
                }}
                min={new Date("2024-07-01").getTime()}
                max={new Date("2025-01-01").getTime()}
            ></input>
            <button
                onClick={() => {
                    setEnd(1723309168142);
                }}
            >
                b
            </button>
            <button
                onClick={() => {
                    setEnd(1724856722124);
                }}
            >
                a
            </button>
            <label className="text-2xl font-semibold px-5">
                Showing data from {getDate(start)} to {getDate(end)}
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
