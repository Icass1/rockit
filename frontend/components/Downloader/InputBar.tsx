"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

export default function InputBar() {
    const [url, setURL] = useState("");

    return (
        <div className="flex w-full flex-row items-center gap-2 px-2">
            <input
                list="browsers"
                type="search"
                className="my-2 w-full rounded-full bg-neutral-800 px-4 py-2 focus:outline-0"
                // placeholder={vocabulary.DOWNLOAD_INPUT_PLACEHOLDER}
                value={url}
                onChange={(e) => {
                    setURL(e.target.value);
                }}
            />

            {/* Download Button */}
            <div
                className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-pink-700 hover:bg-pink-800"
                onClick={() => {
                    // rockIt.downloaderManager.startDownloadAsync(url);
                }}
            >
                <ArrowDownToLine className="h-5 w-5 text-white" />
            </div>
        </div>
    );
}
