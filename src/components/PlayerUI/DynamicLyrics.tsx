"use client";
import { currentSong, currentTime, setTime } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { useEffect, useState, useCallback } from "react";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";

interface LyricLine {
    time: number;
    text: string;
}

export function DynamicLyrics() {
    const $currentSong = useStore(currentSong);
    const $currentTime = useStore(currentTime);
    const [lyricsIndex, setLyricsIndex] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showEditButton, setShowEditButton] = useState(false);
    const [editableLyrics, setEditableLyrics] = useState<LyricLine[]>([]);
    const [hasTimestamps, setHasTimestamps] = useState(false);

    // Original lyrics data
    const [lyrics, setLyrics] = useState<string[]>([]);
    const [lyricsTimeStamp, setLyricsTimeStamp] = useState<
        { time: number; index: number }[]
    >([]);

    // Fetch lyrics
    useEffect(() => {
        if (!$currentSong?.id) return;

        setLyrics([]);
        setLyricsTimeStamp([]);
        setLyricsIndex(0);
        setEditableLyrics([]);

        fetch(`/api/lyrics/${$currentSong?.id}`)
            .then((response) => response.json())
            .then(
                (data: {
                    dynamicLyrics: boolean;
                    lyrics: string | { seconds: number; lyrics: string }[];
                }) => {
                    if (!data.lyrics) {
                        setLyrics([]);
                        return;
                    }

                    if (
                        data.dynamicLyrics === true &&
                        Array.isArray(data.lyrics)
                    ) {
                        const lyricsArray = data.lyrics.map(
                            (line) => line.lyrics
                        );
                        setLyrics(lyricsArray);
                        setHasTimestamps(true);

                        const timestamps = data.lyrics.map((line, index) => ({
                            time: line.seconds,
                            index,
                        }));
                        setLyricsTimeStamp(timestamps);

                        // Initialize editable lyrics
                        setEditableLyrics(
                            data.lyrics.map((line) => ({
                                time: line.seconds,
                                text: line.lyrics,
                            }))
                        );
                    } else if (typeof data.lyrics === "string") {
                        const lyricsArray = data.lyrics
                            .split("\n")
                            .filter((l) => l);
                        setLyrics(lyricsArray);
                        setHasTimestamps(false);
                        setLyricsTimeStamp([]);

                        // Initialize editable lyrics without timestamps
                        setEditableLyrics(
                            lyricsArray.map((text) => ({
                                time: 0,
                                text,
                            }))
                        );
                    }
                }
            )
            .catch((error) => console.log("Error loading lyrics", error));
    }, [$currentSong]);

    // Keyboard navigation
    useEffect(() => {
        if (!lyrics.length || isEditMode) return;

        const handleKey = (event: KeyboardEvent) => {
            if (event.code === "ArrowDown") {
                setLyricsIndex((value) => {
                    const index = Math.min(value + 1, lyrics.length - 1);
                    if (lyricsTimeStamp.length > 0) {
                        setTime(lyricsTimeStamp[index].time + 0.01);
                    }
                    return index;
                });
            } else if (event.code === "ArrowUp") {
                setLyricsIndex((value) => {
                    const index = Math.max(value - 1, 0);
                    if (lyricsTimeStamp.length > 0) {
                        setTime(lyricsTimeStamp[index].time + 0.01);
                    }
                    return index;
                });
            }
        };

        document.addEventListener("keyup", handleKey);
        return () => document.removeEventListener("keyup", handleKey);
    }, [lyrics, lyricsIndex, lyricsTimeStamp, isEditMode]);

    // Sync with current time
    useEffect(() => {
        if (
            !$currentSong ||
            !$currentTime ||
            lyricsTimeStamp.length === 0 ||
            isEditMode
        )
            return;

        let index = lyricsTimeStamp
            .toSorted((a, b) => b.time - a.time)
            .find((timeStamp) => timeStamp.time < $currentTime + 0.5)?.index;

        if (typeof index !== "number") index = 0;
        setLyricsIndex(index);
    }, [$currentTime, $currentSong, lyricsTimeStamp, isEditMode]);

    // Handle edit mode actions
    const handleAddLine = useCallback(
        (index: number) => {
            const newLine: LyricLine = {
                time: index > 0 ? editableLyrics[index - 1].time + 1 : 0,
                text: "",
            };
            const newLyrics = [...editableLyrics];
            newLyrics.splice(index, 0, newLine);
            setEditableLyrics(newLyrics);
        },
        [editableLyrics]
    );

    const handleDeleteLine = useCallback(
        (index: number) => {
            setEditableLyrics(editableLyrics.filter((_, i) => i !== index));
        },
        [editableLyrics]
    );

    const handleUpdateLine = useCallback(
        (index: number, field: "time" | "text", value: string) => {
            const newLyrics = [...editableLyrics];
            if (field === "time") {
                const time = parseFloat(value) || 0;
                newLyrics[index].time = Math.max(0, time);
            } else {
                newLyrics[index].text = value;
            }
            setEditableLyrics(newLyrics);
        },
        [editableLyrics]
    );

    const handleSave = useCallback(() => {
        // Update local state with edited lyrics
        const newLyrics = editableLyrics.map((l) => l.text);
        setLyrics(newLyrics);

        if (hasTimestamps) {
            const newTimestamps = editableLyrics.map((l, index) => ({
                time: l.time,
                index,
            }));
            setLyricsTimeStamp(newTimestamps);
        }

        setIsEditMode(false);
        // Here would be the API call to save, but as requested, we don't save
        console.log("Save lyrics (mockup):", editableLyrics);
    }, [editableLyrics, hasTimestamps]);

    const handleCancel = useCallback(() => {
        // Reset to original lyrics
        if (lyricsTimeStamp.length > 0) {
            setEditableLyrics(
                lyrics.map((text, i) => ({
                    time: lyricsTimeStamp[i]?.time || 0,
                    text,
                }))
            );
        } else {
            setEditableLyrics(
                lyrics.map((text) => ({
                    time: 0,
                    text,
                }))
            );
        }
        setIsEditMode(false);
    }, [lyrics, lyricsTimeStamp]);

    // Format time helper
    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, "0")}`;
    }, []);

    if (!lyrics.length) {
        return (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4 text-neutral-400">
                No lyrics found
            </div>
        );
    }

    // Edit Mode UI
    if (isEditMode) {
        return (
            <div className="relative h-full w-full overflow-hidden">
                <div className="absolute inset-x-0 top-0 z-10 pt-14 pb-20">
                    <div className="flex items-center justify-between px-6">
                        <h3 className="text-xl font-semibold text-white">
                            Edit Lyrics
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-1 rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-600"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
                            >
                                <Check size={16} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-6 pt-32 pb-32">
                    <div className="mx-auto max-w-3xl space-y-2">
                        {editableLyrics.map((line, index) => (
                            <div
                                key={index}
                                className="group relative flex items-start gap-3 rounded-lg bg-neutral-800/50 p-3 transition-all hover:bg-neutral-800/70"
                            >
                                {hasTimestamps && (
                                    <div className="flex-shrink-0">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={line.time}
                                            onChange={(e) =>
                                                handleUpdateLine(
                                                    index,
                                                    "time",
                                                    e.target.value
                                                )
                                            }
                                            className="w-20 rounded bg-neutral-700 px-2 py-1 text-sm text-white transition-colors outline-none focus:bg-neutral-600 focus:ring-2 focus:ring-green-500"
                                            placeholder="0.0"
                                        />
                                        <div className="mt-1 text-xs text-neutral-500">
                                            {formatTime(line.time)}
                                        </div>
                                    </div>
                                )}

                                <input
                                    type="text"
                                    value={line.text}
                                    onChange={(e) =>
                                        handleUpdateLine(
                                            index,
                                            "text",
                                            e.target.value
                                        )
                                    }
                                    className="flex-1 rounded bg-neutral-700 px-3 py-1.5 text-white transition-colors outline-none focus:bg-neutral-600 focus:ring-2 focus:ring-green-500"
                                    placeholder="Enter lyrics..."
                                />

                                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        onClick={() => handleAddLine(index + 1)}
                                        className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-600 hover:text-white"
                                        title="Add line below"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLine(index)}
                                        className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-600 hover:text-white"
                                        title="Delete line"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {editableLyrics.length === 0 && (
                            <button
                                onClick={() => handleAddLine(0)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-600 py-8 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                            >
                                <Plus size={20} />
                                Add first line
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const commonStyles =
        "absolute text-center left-1/2 -translate-x-1/2 w-[90%] -translate-y-1/2 transition-all duration-500 text-balance origin-center";

    return (
        <div
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4"
            onMouseEnter={() => setShowEditButton(true)}
            onMouseLeave={() => setShowEditButton(false)}
        >
            <header
                id="lyrics-header"
                className="absolute inset-x-0 top-0 z-20 items-center justify-center px-6 py-6 hidden md:flex"
            >
                <div className="ml-8 inline-flex items-center gap-2">
                    <h2 className="text-3xl font-bold text-white select-none">
                        Lyrics
                    </h2>

                    {/* Botón editar: visible siempre en móviles; en desktop controlado por showEditButton */}
                    <button
                        onClick={() => setIsEditMode(true)}
                        aria-label="Edit lyrics"
                        className={`pointer-events-auto rounded-lg p-1 text-neutral-400 opacity-100 transition hover:text-white focus:ring-2 focus:ring-green-500 focus:outline-none lg:transition-opacity ${showEditButton ? "lg:pointer-events-auto lg:opacity-100" : "lg:pointer-events-none lg:opacity-0"}`}
                    >
                        <Pencil size={22} />
                    </button>
                </div>
            </header>
            {lyrics.map((line, index) => {
                switch (index - lyricsIndex) {
                    case -2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonStyles +
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
                                    top: "20%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                }}
                            >
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case -1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonStyles +
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
                                    top: "33%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                }}
                            >
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 0:
                        return (
                            <div
                                key={index}
                                className={
                                    commonStyles +
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
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 1:
                        return (
                            <div
                                key={index}
                                className={
                                    commonStyles +
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
                                    top: "67%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                }}
                            >
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                    case 2:
                        return (
                            <div
                                key={index}
                                className={
                                    commonStyles +
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
                                    top: "80%",
                                    fontSize: "4vh",
                                    fontWeight: 500,
                                    lineHeight: "4vh",
                                    maxWidth: "100%",
                                    color: "rgb(200, 200, 200)",
                                }}
                            >
                                {line.replace(/ /g, " ")}
                            </div>
                        );
                }

                if (index - lyricsIndex > 0) {
                    return (
                        <div
                            key={index}
                            className={commonStyles + " scale-[0]"}
                            style={{
                                top: "75%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                            }}
                        >
                            {line.replace(/ /g, " ")}
                        </div>
                    );
                } else {
                    return (
                        <div
                            key={index}
                            className={commonStyles + " scale-[0]"}
                            style={{
                                top: "25%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200, 200, 200)",
                            }}
                        >
                            {line.replace(/ /g, " ")}
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
