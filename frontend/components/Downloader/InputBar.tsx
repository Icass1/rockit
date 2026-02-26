"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import useDev from "@/hooks/useDev";
import { ArrowDownToLine } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function InputBar() {
    const [url, setURL] = useState("");

    const dev = useDev();

    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    return (
        <div className="flex w-full flex-row items-center gap-2 px-2">
            <input
                list="browsers"
                type="search"
                className="my-2 w-full rounded-full bg-neutral-800 px-4 py-2 focus:outline-0"
                placeholder={lang.download_input_placeholder}
                value={url}
                onChange={(e) => {
                    setURL(e.target.value);
                }}
            />
            {dev && (
                <datalist id="browsers">
                    <option value="https://open.spotify.com/album/6fQElzBNTiEMGdIeY0hy5l" />
                    <option value="https://open.spotify.com/album/6WivmTXugLZLmAWnZhlz7g" />
                    <option value="https://open.spotify.com/playlist/0kqz3FKC3yz3L1sJTqmRCh" />
                    <option value="https://open.spotify.com/playlist/7h6r9ScqSjCHH3QozfBdIq" />
                    <option value="https://open.spotify.com/track/1w3W1hz6xVUSWkbh0paMgs" />
                </datalist>
            )}
            {/* Download Button */}
            <div
                className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800"
                onClick={() => {
                    rockIt.downloaderManager.startDownloadAsync(url);
                }}
            >
                <ArrowDownToLine className="h-5 w-5 text-white" />
            </div>
        </div>
    );
}
