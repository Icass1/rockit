"use client";

import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadLiveFeed from "@/components/Downloader/DownloadLiveFeed";

// ─── Clear button ─────────────────────────────────────────────────────────────
// Inline here — too small to be its own file

function ClearButton() {
    const $downloads = useStore(rockIt.downloaderManager.downloadInfoAtom);
    const hasCompleted = $downloads.some((d) => d.completed === 100);

    if (!hasCompleted) return null;

    return (
        <button
            type="button"
            className="text-xs text-neutral-500 transition-colors hover:text-white"
            onClick={() => rockIt.downloaderManager.clearCompleted?.()}
        >
            Clear completed
        </button>
    );
}

// ─── Source logos ─────────────────────────────────────────────────────────────

function SourceLogos() {
    return (
        <div className="flex items-center gap-4">
            <Image
                width={24}
                height={24}
                src="/youtube-music-logo.svg"
                alt="YouTube Music"
                className="h-5 w-5 object-contain opacity-70"
            />
            <Image
                width={24}
                height={24}
                src="/spotify-logo.png"
                alt="Spotify"
                className="h-5 w-5 object-contain opacity-70"
            />
        </div>
    );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function DownloaderClient() {
    return (
        <div className="h-full w-full overflow-y-auto px-4 py-6 md:px-10 md:py-10">
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Downloader
                        </h1>
                        <p className="mt-0.5 text-sm text-neutral-500">
                            Paste a Spotify or YouTube URL to download
                        </p>
                    </div>
                    <SourceLogos />
                </div>

                {/* Input card */}
                <div className="mb-6 rounded-xl bg-neutral-900 py-1">
                    <DownloadInputBar />
                </div>

                {/* Live feed */}
                <div className="flex items-center justify-between px-1 mb-3">
                    <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                        Downloads
                    </h2>
                    <ClearButton />
                </div>

                <DownloadLiveFeed />

                {/* Bottom padding for mobile footer */}
                <div className="h-10" />
            </div>
        </div>
    );
}