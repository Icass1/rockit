"use client";

import { useEffect } from "react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadLiveFeed from "@/components/Downloader/DownloadLiveFeed";

export default function DownloaderClient() {
    useEffect(() => {
        // Initialize the downloader manager (safe to call multiple times)
        rockIt.downloaderManager.init();
    }, []);

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-neutral-900/50 p-4">
                <h2 className="mb-4 text-xl font-semibold">Downloader</h2>
                <DownloadInputBar />
            </div>
            <DownloadLiveFeed />
        </div>
    );
}
