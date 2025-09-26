"use client";

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

                    if (lyricsTimeStamp.length > 0)
                        setTime(lyricsTimeStamp[index].time + 0.01);
                    return index;
                });
                console.log(currentTime.get(), lyricsIndex);
            } else if (event.code == "ArrowUp") {
                setLyricsIndex((value) => {
                    const index = Math.max(value - 1, 0);
                    if (lyricsTimeStamp.length > 0)
                        setTime(lyricsTimeStamp[index].time + 0.01);
                    return index;
                });
            }
        };

        document.addEventListener("keyup", handleKey);

        return () => {
            document.removeEventListener("keyup", handleKey);
        };
    }, [lyrics, lyricsIndex, lyricsTimeStamp]);

    useEffect(() => {
        if (!$currentSong || !$currentTime || lyricsTimeStamp.length == 0) {
            return;
        }

        let index = lyricsTimeStamp
            .toSorted((a, b) => b.time - a.time)
            .find((timeStamp) => timeStamp.time < $currentTime + 0.5)?.index;
        if (typeof index != "number") {
            index = 0;
        }

        setLyricsIndex(index);
    }, [$currentTime, $currentSong, lyricsTimeStamp]);

    if (typeof lyrics == "string" || typeof lyrics == "undefined") {
        return (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4">
                No lyrics found
            </div>
        );
    }

    const commonSyles =
        "absolute text-center left-1/2 -translate-x-1/2 w-full -translate-y-1/2 transition-all duration-500 text-balance origin-center";

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4">
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.4]" +
                                    (lyricsTimeStamp.length > 0
                                        ? " cursor-pointer hover:brightness-150"
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
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case -1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.6]" +
                                    (lyricsTimeStamp.length > 0
                                        ? " cursor-pointer hover:brightness-150"
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
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 0:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    (lyricsTimeStamp.length > 0
                                        ? " cursor-pointer hover:brightness-150"
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
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.6]" +
                                    (lyricsTimeStamp.length > 0
                                        ? " cursor-pointer hover:brightness-150"
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
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonSyles +
                                    " scale-[.4]" +
                                    (lyricsTimeStamp.length > 0
                                        ? " cursor-pointer hover:brightness-150"
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
                                {line.replace(/ /g, " ")}
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
                            {line.replace(/ /g, " ")}
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
                            {line.replace(/ /g, " ")}
                        </div>
                    );
                }
            })}
            {lyricsTimeStamp.length == 0 && (
                <div
                    className="dynamic-lyrics-scroll hide-scroll-track hide-scroll-thumb absolute block h-full w-full max-w-full min-w-0 overflow-auto"
                    onScroll={(e) => {
                        setLyricsIndex(
                            Math.floor(e.currentTarget.scrollTop / 100)
                        );
                    }}
                >
                    <div
                        className="w-full"
                        style={{
                            height:
                                (lyrics.length - 1) * 100 +
                                ((
                                    document.querySelector(
                                        ".dynamic-lyrics-scroll"
                                    ) as HTMLDivElement | undefined
                                )?.offsetHeight ?? 0) +
                                "px",
                        }}
                    ></div>
                </div>
            )}
        </div>
    );
}
