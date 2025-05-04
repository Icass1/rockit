"use client";

import Image from "@/components/Image";
import { downloadInfo, startDownload } from "@/stores/downloads";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ArrowDownToLine } from "lucide-react";
import { useState } from "react";

export default function DownloaderPage() {
    const [url, setURL] = useState("");

    const $downloadInfo = useStore(downloadInfo);

    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
        <div className="relative mx-auto h-full w-[500px] bg-neutral-700 md:pt-24 md:pb-24">
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
            <label className="mx-auto block w-fit py-3 text-3xl font-extrabold">
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
            <div className="flex flex-col">
                {Object.entries($downloadInfo).map((entry) => {
                    return (
                        <div key={entry[0]} className="flex flex-col">
                            <div>
                                {entry[0]}:{entry[1].completed} -{" "}
                                {entry[1].message}
                            </div>

                            <div className="relative h-2 w-1/2 bg-neutral-800">
                                <div
                                    className="h-full bg-red-400"
                                    style={{ width: entry[1].completed + "%" }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
