"use client";

import { useState } from "react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadInputBar() {
    const [url, setUrl] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsDownloading(true);
        setError(null);

        try {
            await rockIt.downloaderManager.startDownloadAsync(url);
            setUrl("");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown error";
            setError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSubmit} className="min-w-0 flex-1">
                <div className="relative">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste Spotify or YouTube URL..."
                        className="block w-full rounded-md border border-neutral-600 bg-neutral-800/50 px-4 py-2 text-sm text-white placeholder-neutral-400 focus:border-[#ee1086] focus:ring-2 focus:ring-[#ee1086]"
                    />
                    <button
                        type="submit"
                        disabled={isDownloading}
                        className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-transparent bg-[#ee1086] px-2.5 text-xs font-medium text-white hover:bg-[#ee1086]/90 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <svg
                                className="h-4 w-4 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.989 8.989 0 014 16a9 9 0 1012.532 8m-6.364-4.364a5.556 5.556 0 01-7.073 7.073"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </form>

            <div className="flex items-center gap-3 text-sm text-neutral-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-600 bg-neutral-800/20">
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <span>Supports Spotify & YouTube URLs</span>
            </div>
        </div>
    );
}
