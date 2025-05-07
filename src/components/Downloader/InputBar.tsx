"use client";

import { startDownload } from "@/stores/downloads";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ArrowDownToLine } from "lucide-react";
import { useState } from "react";

export default function InputBar() {
    const [url, setURL] = useState("");

    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
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
                <option value="https://open.spotify.com/playlist/0kqz3FKC3yz3L1sJTqmRCh" />
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
    );
}
