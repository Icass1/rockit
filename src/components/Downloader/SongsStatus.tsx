"use client";

import { downloadInfo } from "@/stores/downloads";
import { useStore } from "@nanostores/react";
import Image from "@/components/Image";
import { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { langData } from "@/stores/lang";
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
    const [song, setSong] =
        useState<SongDB<"name" | "image" | "albumId" | "albumName">>();

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
                {song?.image ? (
                    <Image
                        alt="Cover"
                        src={getImageUrl({
                            imageId: song?.image,
                            width: 40,
                            height: 40,
                            placeHolder: "/song-placeholder.png",
                        })}
                        className="h-full w-full"
                    />
                ) : (
                    <div
                        className="skeleton h-full w-full"
                        style={{ gridArea: "cover" }}
                    />
                )}
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
    const $downloadInfo = useStore(downloadInfo);

    const $lang = useStore(langData);
    if (!$lang) return false;

    let someSelected = false;

    const downloadInfoSorted = Object.entries($downloadInfo).toSorted(
        (a, b) => {
            if (a[1].selected || b[1].selected) someSelected = true;

            let bCompleted: number = b[1].completed;
            if (b[1].completed == 100) bCompleted = -2;
            if (b[1].message == "Error") bCompleted = -2;
            if (b[1].message == "In queue") bCompleted = -1;

            let aCompleted: number = a[1].completed;
            if (a[1].completed == 100) aCompleted = -2;
            if (a[1].message == "Error") aCompleted = -2;
            if (a[1].message == "In queue") aCompleted = -1;

            return bCompleted - aCompleted;
        }
    );

    return (
        <>
            <div className="relative w-full">
                <div
                    className=""
                    style={{
                        minHeight: `${downloadInfoSorted.length * 50}px`,
                    }}
                ></div>
                {Object.entries($downloadInfo)
                    .filter((entry) => {
                        if (someSelected) {
                            return entry[1].selected;
                        } else {
                            return true;
                        }
                    })
                    .map((entry) => {
                        const index = downloadInfoSorted.findIndex(
                            (_entry) => _entry[0] == entry[0]
                        );

                        return (
                            <div
                                key={entry[0]}
                                className="absolute w-full transition-[top] duration-500"
                                style={{ top: `${index * 50}px` }}
                            >
                                <SongDownload
                                    id={entry[0]}
                                    completed={entry[1].completed}
                                    message={entry[1].message}
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
