import { currentSong, currentTime } from "@/stores/audio";
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
                    console.log(data);

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
            );
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
            <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%]">
                No lyrics found
            </div>
        );
    }

    const commonSyles =
        "absolute pl-16 pr-4 text-center -translate-y-1/2 transition-all duration-500 text-balance";

    return (
        <div className="flex flex-col justify-center items-center px-4 overflow-hidden relative h-full min-w-[31.5%] ">
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
