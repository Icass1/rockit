"use client";

import Image from "@/components/Image";
import { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { downloadInfo } from "@/stores/downloads";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
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
        console.log(id);

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

            <div
                className="progress-bar relative h-2 w-full max-w-full min-w-0 rounded-full bg-neutral-800"
                style={{ gridArea: "progress-bar" }}
            >
                <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-[width]"
                    style={{ width: completed + "%" }}
                ></div>
            </div>
        </div>
    );
}

export default function DownloaderPage() {
    const $downloadInfo = useStore(downloadInfo);

    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
        <div className="relative mx-auto h-full w-[500px] overflow-y-auto bg-neutral-700 md:pt-24 md:pb-24">
            <div className="flex flex-col gap-2">
                {Object.entries($downloadInfo).map((entry) => {
                    return (
                        <SongDownload
                            key={entry[0]}
                            id={entry[0]}
                            completed={entry[1].completed}
                            message={entry[1].message}
                        />
                    );
                })}
            </div>
            <div className="min-h-10" />
        </div>
    );
}
