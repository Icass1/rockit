"use client";

import Image from "@/components/Image";
import { SongDB } from "@/lib/db/song";
import { getImageUrl } from "@/lib/getImageUrl";
import { downloadInfo, startDownload } from "@/stores/downloads";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ArrowDownToLine } from "lucide-react";
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
    const [name, setName] = useState<string | undefined>();
    const [image, setImage] = useState<string | undefined>();

    useEffect(() => {
        console.log(id);

        fetch(`/api/song/${id}?q=name,image`)
            .then((response) => response.json())
            .then((data: SongDB<"name" | "image">) => {
                setName(data.name);
                setImage(
                    getImageUrl({
                        imageId: data.image,
                        width: 40,
                        height: 40,
                        placeHolder: "/song-placeholder.png",
                    })
                );
            });
    }, [id]);

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
                {image ? (
                    <Image alt="Cover" src={image} className="h-full w-full" />
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
                {name ? (
                    <label>{name}</label>
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
                    className="absolute h-full transition-[width] rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                    style={{ width: completed + "%" }}
                ></div>
            </div>
        </div>
    );
}

export default function DownloaderPage() {
    const [url, setURL] = useState("");

    const $downloadInfo = useStore(downloadInfo);

    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
        <div className="relative mx-auto h-full w-[500px] overflow-y-auto bg-neutral-700 md:pt-24 md:pb-24">
            <div className="mt-5 flex justify-center gap-6">
                <Image
                    width={30}
                    height={30}
                    src="/youtube-music-logo.svg"
                    alt="YouTube Music Logo"
                    className="h-6 object-contain"
                />
                <Image
                    width={30}
                    height={30}
                    src="/spotify-logo.png"
                    alt="Spotify Logo"
                    className="h-7 object-contain"
                />
            </div>
            <label className="ml-3 block w-fit py-3 text-3xl font-bold">
                Music Downloader
            </label>

            <div className="flex w-full flex-row items-center gap-2 px-2">
                {/* Input */}
                <input
                    list="browsers"
                    type="search"
                    className="my-2 w-full rounded-full bg-neutral-800 px-4 py-2 focus:outline-0"
                    placeholder={$lang.download_input_placeholder}
                    value={url}
                    onChange={(e) => {
                        setURL(e.target.value);
                    }}
                />
                <datalist id="browsers">
                    <option value="https://open.spotify.com/album/6fQElzBNTiEMGdIeY0hy5l" />
                    <option value="https://open.spotify.com/track/1w3W1hz6xVUSWkbh0paMgs" />
                    <option value="https://open.spotify.com/album/6WivmTXugLZLmAWnZhlz7g" />
                </datalist>

                {/* Download Button */}
                <div
                    className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800"
                    onClick={() => {
                        startDownload(url);
                    }}
                >
                    <ArrowDownToLine className="h-5 w-5 text-white" />
                </div>
            </div>
            <div className="mb-4 flex items-center justify-between">
                {Object.entries(status).length != 0 && (
                    <label className="text-lg font-bold text-white">
                        {$lang.latest_downloads}
                    </label>
                )}

                <button
                    className="mr-2 text-sm text-blue-500 md:hover:underline"
                    onClick={() => {
                        // Lógica para limpiar los downloads
                        console.log("Clear downloads clicked");
                    }}
                >
                    {$lang.clear_downloads}
                </button>
            </div>
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
