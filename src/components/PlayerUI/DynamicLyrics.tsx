import type { SongDB } from "@/lib/db/song";
import { currentSong, currentTime } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";

const lyricsTimeStamp = {
    "3jnoftwNCmIuTNVkxakisg": [
        { time: 0, index: -1 },
        { time: 3.616696, index: 0 },
        // { time: 8.950831, index: 1 },
        { time: 9.215222, index: 2 },
        { time: 14.526888, index: 3 },
        { time: 19.325092, index: 4 },
        { time: 25.185074, index: 5 },
        { time: 29.956093, index: 6 },
        { time: 35.822759, index: 7 },
        { time: 41.933646, index: 8 },
        { time: 45.124741, index: 9 },
        // { time: 47.509194, index: 10 },
        { time: 47.509194, index: 11 },
        { time: 50.695647, index: 12 },
        { time: 55.217082, index: 13 },
        { time: 61.316389, index: 14 },
        { time: 66.366691, index: 15 },
        { time: 71.945134, index: 16 },
        { time: 78.338074, index: 17 },
        { time: 81.540765, index: 18 },
        // { time: 83.660661, index: 19 },
        { time: 83.923712, index: 20 },
        { time: 87.139223, index: 21 },
        { time: 91.656725, index: 22 },
        { time: 98.039327, index: 23 },
        { time: 102.576683, index: 24 },
        { time: 106.552604, index: 25 },
        { time: 111.614134, index: 26 },
        { time: 117.469267, index: 27 },
        { time: 123.325435, index: 28 },
        { time: 128.892991, index: 29 },
        { time: 129.159588, index: 30 },
        { time: 135.81524, index: 31 },
        { time: 137.153702, index: 32 },
        // { time: 141.154856, index: 33 },
        { time: 141.421138, index: 34 },
        { time: 144.35482, index: 35 },
        { time: 149.405762, index: 36 },
        { time: 155.248614, index: 37 },
        { time: 160.018923, index: 38 },
        { time: 165.865251, index: 39 },
        { time: 171.726646, index: 40 },
        { time: 175.445873, index: 41 },
        // { time: 177.831607, index: 42 },
        { time: 177.831607, index: 43 },
        { time: 181.566975, index: 44 },
        { time: 186.092668, index: 45 },
        { time: 191.953785, index: 46 },
        { time: 196.467401, index: 47 },
        { time: 200.977231, index: 48 },
        { time: 204.963814, index: 49 },
        { time: 211.339704, index: 50 },
        { time: 217.469934, index: 51 },
    ].reverse(),
};

export function DynamicLyrics() {
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);

    const [lyricsIndex, setLyricsIndex] = useState(0);
    const [lyrics, setLyrics] = useState<string[] | string>();

    useEffect(() => {
        if (!$currentSong?.id) {
            return;
        }

        fetch(`/api/song/${$currentSong?.id}?q=lyrics`)
            .then((response) => response.json())
            .then((data: SongDB<"lyrics">) => {
                if (!data.lyrics) {
                    return;
                }
                setLyrics(data.lyrics.split("\n") || "");
            });
    }, [$currentSong]);

    useEffect(() => {
        if (!lyrics) {
            return;
        }

        const handleKey = (event: KeyboardEvent) => {
            if (event.code == "ArrowRight") {
                setLyricsIndex((value) =>
                    Math.min(value + 1, lyrics.length - 1)
                );
                console.log(currentTime.get(), lyricsIndex);
            } else if (event.code == "ArrowLeft") {
                setLyricsIndex((value) => Math.max(value - 1, 0));
            }
        };

        document.addEventListener("keyup", handleKey);

        return () => {
            document.removeEventListener("keyup", handleKey);
        };
    }, [lyrics, lyricsIndex]);

    useEffect(() => {
        if (!$currentSong || !$currentTime) {
            return;
        }

        const timeStamps = Object.entries(lyricsTimeStamp).find((a) => {
            return a[0] == $currentSong.id;
        })?.[1];
        if (!timeStamps) {
            return;
        }

        const index = timeStamps.find(
            (timeStamp) => timeStamp.time < $currentTime
        )?.index;
        if (typeof index != "number") {
            return;
        }

        setLyricsIndex(index + 1);
    }, [$currentTime, $currentSong]);

    if (typeof lyrics == "string" || typeof lyrics == "undefined") {
        return (
            <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%]">
                No lyrics found
            </div>
        );
    }

    const commonSyles =
        "absolute pl-16 pr-4 text-center -translate-y-1/2 transition-all duration-500 text-balance";

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%]">
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "25%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.4",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case -1:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "35%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 0:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "50%",
                                    fontSize: "4vh",
                                    fontWeight: 600,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 1:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "63%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 2:
                        return (
                            <div
                                key={index}
                                className={commonSyles}
                                style={{
                                    top: "75%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    scale: "0.4",
                                }}
                            >
                                {line}
                            </div>
                        );
                }

                if (index - lyricsIndex > 0) {
                    return (
                        <div
                            key={index}
                            className={commonSyles}
                            style={{
                                top: "75%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                                scale: 0,
                            }}
                        >
                            {line}
                        </div>
                    );
                } else {
                    return (
                        <div
                            key={index}
                            className={commonSyles}
                            style={{
                                top: "25%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                                scale: 0,
                            }}
                        >
                            {line}
                        </div>
                    );
                }
            })}
        </div>
    );
}
