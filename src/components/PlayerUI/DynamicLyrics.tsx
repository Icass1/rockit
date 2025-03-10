import { currentSong, currentTime, setTime } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";

export function DynamicLyrics() {
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);

    const [lyricsIndex, setLyricsIndex] = useState(0);
    const [lyrics, setLyrics] = useState<string[] | string>();

    const [lyricsTimeStamp, setLyricsTimeStamp] = useState<
        { time: number; index: number }[]
    >([]);

    useEffect(() => {
        if (!$currentSong?.id) {
            return;
        }

        setLyrics("");
        setLyricsTimeStamp([]);
        setLyricsIndex(0);

        fetch(`/api/lyrics/${$currentSong?.id}`)
            .then((response) => response.json())
            .then(
                (
                    data:
                        | { dynamicLyrics: false; lyrics: string }
                        | {
                              dynamicLyrics: true;
                              lyrics: { seconds: number; lyrics: string }[];
                          }
                ) => {
                    if (!data.lyrics) {
                        setLyrics("");
                        setLyricsTimeStamp([]);
                        return;
                    }
                    if (data.dynamicLyrics == true) {
                        setLyrics(data.lyrics.map((line) => line.lyrics));
                        setLyricsTimeStamp(
                            data.lyrics.map((line, index) => {
                                return { time: line.seconds, index: index };
                            })
                        );
                    } else if (data.dynamicLyrics == false) {
                        setLyricsTimeStamp([]);
                        setLyrics(data.lyrics.split("\n") || "");
                    }
                }
            )
            .catch((error) => console.log("Error loading lyrics", error));
    }, [$currentSong]);

    useEffect(() => {
        if (!lyrics) {
            return;
        }

        const handleKey = (event: KeyboardEvent) => {
            if (event.code == "ArrowDown") {
                setLyricsIndex((value) => {
                    const index = Math.min(value + 1, lyrics.length - 1);
                    setTime(lyricsTimeStamp[index].time + 0.01);
                    return index;
                });
                console.log(currentTime.get(), lyricsIndex);
            } else if (event.code == "ArrowUp") {
                setLyricsIndex((value) => {
                    const index = Math.max(value - 1, 0);
                    setTime(lyricsTimeStamp[index].time + 0.01);
                    return index;
                });
            }
        };

        document.addEventListener("keyup", handleKey);

        return () => {
            document.removeEventListener("keyup", handleKey);
        };
    }, [lyrics, lyricsIndex]);

    useEffect(() => {
        if (!$currentSong || !$currentTime || lyricsTimeStamp.length == 0) {
            return;
        }

        let index = lyricsTimeStamp
            .toSorted((a, b) => b.time - a.time)
            .find((timeStamp) => timeStamp.time < $currentTime)?.index;
        if (typeof index != "number") {
            index = 0;
        }

        setLyricsIndex(index);
    }, [$currentTime, $currentSong]);

    if (typeof lyrics == "string" || typeof lyrics == "undefined") {
        return (
            <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full w-full">
                No lyrics found
            </div>
        );
    }

    const commonSyles =
        "absolute text-center left-1/2 -translate-x-1/2 w-full -translate-y-1/2 transition-all duration-500 text-balance origin-center";

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full w-full">
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.4] " +
                                    (lyricsTimeStamp.length > 0
                                        ? " hover:brightness-150 cursor-pointer "
                                        : "")
                                }
                                onClick={() => {
                                    if (lyricsTimeStamp.length > 0)
                                        setTime(
                                            lyricsTimeStamp[index].time + 0.01
                                        );
                                }}
                                style={{
                                    top: "25%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case -1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.6] " +
                                    (lyricsTimeStamp.length > 0
                                        ? " hover:brightness-150 cursor-pointer "
                                        : "")
                                }
                                onClick={() => {
                                    if (lyricsTimeStamp.length > 0)
                                        setTime(
                                            lyricsTimeStamp[index].time + 0.01
                                        );
                                }}
                                style={{
                                    top: "35%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    // scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 0:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    (lyricsTimeStamp.length > 0
                                        ? " hover:brightness-150 cursor-pointer "
                                        : "")
                                }
                                style={{
                                    top: "50%",
                                    fontSize: "4vh",
                                    fontWeight: 600,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(230, 230, 230)",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.6] " +
                                    (lyricsTimeStamp.length > 0
                                        ? " hover:brightness-150 cursor-pointer "
                                        : "")
                                }
                                onClick={() => {
                                    if (lyricsTimeStamp.length > 0)
                                        setTime(
                                            lyricsTimeStamp[index].time + 0.01
                                        );
                                }}
                                style={{
                                    top: "63%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    // scale: "0.6",
                                }}
                            >
                                {line}
                            </div>
                        );
                    case 2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.4] " +
                                    (lyricsTimeStamp.length > 0
                                        ? " hover:brightness-150 cursor-pointer "
                                        : "")
                                }
                                onClick={() => {
                                    if (lyricsTimeStamp.length > 0)
                                        setTime(
                                            lyricsTimeStamp[index].time + 0.01
                                        );
                                }}
                                style={{
                                    top: "75%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                    // scale: "0.4",
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
                            className={commonSyles + " scale-[0]"}
                            style={{
                                top: "75%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                            }}
                        >
                            {line}
                        </div>
                    );
                } else {
                    return (
                        <div
                            key={index}
                            className={commonSyles + " scale-[0]"}
                            style={{
                                top: "25%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
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
