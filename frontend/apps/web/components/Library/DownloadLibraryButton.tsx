"use client";

import { useState, type JSX } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadLibraryButton(): JSX.Element {
    const [loading, setLoading] = useState(false);

    const handleClick = async (): Promise<void> => {
        if (loading) return;

        setLoading(true);
        try {
            const response = await Http.getUserLibraryMedias();
            if (!response.isOk()) {
                rockIt.notificationManager.notifyError(response.message);
                return;
            }

            const ids = new Set<string>();
            for (const item of response.result.songs ?? []) {
                if (!item.item.downloaded) ids.add(item.item.publicId);
            }
            for (const item of response.result.videos ?? []) {
                if (!item.item.downloaded) ids.add(item.item.publicId);
            }
            for (const item of response.result.albums ?? []) {
                if (item.item.undownloadedCount > 0) {
                    ids.add(item.item.publicId);
                }
            }
            for (const item of response.result.playlists ?? []) {
                ids.add(item.item.publicId);
            }

            if (ids.size > 0) {
                await rockIt.downloaderManager.downloadMediaAsync(
                    [...ids],
                    "Library"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            title="Download library"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-white disabled:cursor-wait disabled:opacity-60"
        >
            {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
        </button>
    );
}
