"use client";

import { type JSX } from "react";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadGroup from "@/components/Downloader/DownloadGroup";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";

export default function DownloaderClient(): JSX.Element {
    const { data, loading } = useFetch(Http.getDownloads);

    const startDownload = async (url: string): Promise<void> => {
        const mediaRes = await Http.addFromUrlAsync({
            url,
            addToLibrary: false,
            addToPlaylist: false,
            playlistPublicId: null,
        });
        if (!mediaRes.isOk()) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
            );
            return;
        }
        const publicId = mediaRes.result.data.publicId;
        await rockIt.downloaderManager.startDownloadAsync(publicId, "Download");
    };

    if (!data || loading) return <div>Loading</div>;

    return (
        <div className="space-y-6 px-96">
            <div className="rounded-lg border bg-neutral-900/50 p-4">
                <h2 className="mb-4 text-xl font-semibold">Downloader</h2>
                <DownloadInputBar
                    onSubmit={async (url): Promise<void> => {
                        await startDownload(url);
                    }}
                />
            </div>

            <div className="space-y-4">
                {data?.downloads.map(
                    (group): JSX.Element => (
                        <DownloadGroup key={group.publicId} group={group} />
                    )
                )}
                <div className="text-sm text-neutral-400">
                    {data?.downloads.length ?? 0} total
                </div>
            </div>
        </div>
    );
}
