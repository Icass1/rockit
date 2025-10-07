"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItSongWithAlbum } from "@/lib/rockit/rockItSongWithAlbum";
import { useStore } from "@nanostores/react";
import Image from "next/image";
import { useEffect, useState } from "react";

function SongDownload({
    id,
    completed,
    message,
}: {
    id: string;
    completed: number;
    message: string;
}) {
    const [song, setSong] = useState<RockItSongWithAlbum>();

    useEffect(() => {
        fetch(`/api/song/${id}?q=name,image,albumName,albumId`)
            .then((response) => response.json())
            .then((data) => {
                setSong(data);
            });
    }, [id, setSong]);

    return (
        <div
            className="mx-1 grid grid-cols-[2.5rem_4fr_1fr] grid-rows-[25px_15px] items-center gap-x-2"
            style={{
                gridTemplateAreas: `
                "cover name name"
                "cover progress-bar message" 
                `,
            }}
        >
            <div
                className="h-10 min-h-10 w-10 min-w-10"
                style={{ gridArea: "cover" }}
            >
                <Image
                    alt="Cover"
                    src={
                        song?.album.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    className="h-full w-full"
                />
            </div>

            <div
                style={{ gridArea: "name" }}
                className="h-full w-full max-w-full min-w-0"
            >
                {song?.name ? (
                    <label>{song.name}</label>
                ) : (
                    <div className="skeleton h-4/5 w-2/3 rounded"></div>
                )}
            </div>
            <div
                title={message}
                style={{ gridArea: "message" }}
                className="w-full max-w-full min-w-0 truncate"
            >
                {message}
            </div>

            <div className="flex w-full max-w-full min-w-0 flex-row items-center gap-2">
                <label className="min-w-[30px] text-right text-xs font-semibold text-neutral-300">
                    {Math.round(completed)}%
                </label>
                <div
                    className="progress-bar relative h-2 w-full rounded-full bg-neutral-800"
                    style={{ gridArea: "progress-bar" }}
                >
                    <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-[width] duration-1000"
                        style={{ width: completed + "%" }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

export default function SongsStatus() {
    const $downloadInfo = useStore(rockIt.downloaderManager.downloadInfoAtom);

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    let someSelected = false;

    const downloadInfoSorted = $downloadInfo.toSorted((a, b) => {
        if (a.selected || b.selected) someSelected = true;

        let bCompleted: number = b.completed;
        if (b.completed == 100) bCompleted = -2;
        if (b.message == "Error") bCompleted = -2;
        if (b.message == "In queue") bCompleted = -1;

        let aCompleted: number = a.completed;
        if (a.completed == 100) aCompleted = -2;
        if (a.message == "Error") aCompleted = -2;
        if (a.message == "In queue") aCompleted = -1;

        return bCompleted - aCompleted;
    });

    return (
        <>
            <div className="relative w-full">
                <div
                    className=""
                    style={{
                        minHeight: `${downloadInfoSorted.length * 50}px`,
                    }}
                ></div>
                {$downloadInfo
                    .filter((entry) => {
                        if (someSelected) {
                            return entry.selected;
                        } else {
                            return true;
                        }
                    })
                    .map((entry) => {
                        const index = downloadInfoSorted.findIndex(
                            (_entry) => _entry.publicId == entry.publicId
                        );

                        return (
                            <div
                                key={entry.publicId}
                                className="absolute w-full transition-[top] duration-500"
                                style={{ top: `${index * 50}px` }}
                            >
                                <SongDownload
                                    id={entry.publicId}
                                    completed={entry.completed}
                                    message={entry.message}
                                />
                            </div>
                        );
                    })}
            </div>
            {downloadInfoSorted.length == 0 && (
                <label className="mx-auto mt-10 block w-fit text-xl font-semibold text-neutral-300">
                    There is nothing to show here
                </label>
            )}
            <div className="min-h-10" />
        </>
    );
}
