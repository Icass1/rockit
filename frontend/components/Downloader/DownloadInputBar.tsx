"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadInputBar() {
    const [url, setUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = url.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        try {
            await rockIt.downloaderManager.startDownloadAsync(trimmed);
            setUrl("");
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-2">
            <input
                type="url"
                className="w-full max-w-full rounded-full bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 transition-all focus:ring-2 focus:ring-[#ee1086]/40 focus:outline-none md:max-w-150"
                placeholder="Spotify or YouTube URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={submitting}
                aria-label="Download URL"
            />
            <button
                type="button"
                aria-label="Start download"
                disabled={!url.trim() || submitting}
                onClick={handleSubmit}
                className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-[#ee1086] transition-colors hover:bg-[#d00e74] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ArrowDownToLine className="h-5 w-5 text-white" />
            </button>
        </div>
    );
}
