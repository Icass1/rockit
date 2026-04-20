"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BaseSongWithAlbumResponse } from "@/dto";
import { EDownloadInfoStatus } from "@/models/enums/downloadInfoStatus";
import { isSongWithAlbum } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { DownloadInfo } from "@/lib/managers/downloaderManager";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

interface DownloadItemProps {
    download: BaseSongWithAlbumResponse;
}

export default function DownloadItem({ download }: DownloadItemProps) {
    const $download = useMedia(download);
    const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(
        () => ({
            publicId: download.publicId,
            message: "",
            completed: 0,
            status: EDownloadInfoStatus.Downloading,
        })
    );

    useEffect(() => {
        const handleProgressUpdate = (progress: number) => {
            setDownloadInfo((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    completed: progress,
                    status:
                        progress === 100
                            ? EDownloadInfoStatus.Completed
                            : progress === -1
                              ? EDownloadInfoStatus.Failed
                              : EDownloadInfoStatus.Downloading,
                };
            });
        };

        // Subscribe to download progress updates
        const unsubscribe =
            rockIt.downloaderManager.subscribeToDownloadProgress(
                download.publicId,
                handleProgressUpdate
            );

        return () => {
            unsubscribe();
        };
    }, [download]);

    const getStatusText = (): string => {
        if (!downloadInfo) return "Starting...";
        if (downloadInfo.completed === 100) return "Completed";
        if (downloadInfo.completed === -1) return "Failed";
        if (downloadInfo.completed >= 0) {
            const minutes = Math.floor(downloadInfo.completed / 60);
            const seconds = downloadInfo.completed % 60;
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }
        return "Downloading";
    };

    const getProgressColor = (): string => {
        if (!downloadInfo) return "#ee1086"; // pink for downloading
        if (downloadInfo.completed === 100) return "#1cad60"; // green
        if (downloadInfo.completed === -1) return "#c72e2e"; // red
        return "#ee1086"; // pink for downloading
    };

    const handleRetry = async () => {
        try {
            await rockIt.downloaderManager.startDownloadAsync(
                download.providerUrl
            );
        } catch (err) {
            console.error("Retry failed:", err);
        }
    };

    const handlePlay = () => {
        if (downloadInfo?.completed === 100) {
            const playable = [$download].filter(isSongWithAlbum);
            if (playable.length > 0) {
                rockIt.queueManager.setMedia(playable, "auto-list", "");
                rockIt.queueManager.moveToMedia($download.publicId);
                rockIt.mediaPlayerManager.play();
            }
        }
    };

    return (
        <div className="flex items-start gap-4 border-b border-neutral-700 py-3">
            <MediaContextMenu media={$download}>
                <div className="shrink-0">
                    <Image
                        width={300}
                        height={300}
                        className="h-12 w-12 rounded object-cover"
                        src={$download.imageUrl}
                        alt={`Cover of $download.name`}
                    />
                </div>
            </MediaContextMenu>

            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between">
                    <h3 className="max-w-50 truncate font-semibold text-white">
                        {$download.name}
                    </h3>
                    <span className="text-xs text-neutral-400">
                        {getStatusText()}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-neutral-400">
                    {$download.artists.map((artist, index) => (
                        <>
                            <span
                                key={index}
                                className="max-w-37.5 truncate"
                            >
                                {artist.name}
                            </span>
                            {index < $download.artists.length - 1 && ", "}
                        </>
                    ))}
                </div>

                <div className="h-2.5 w-full rounded-full bg-neutral-700">
                    <div
                        className={`h-2.5 bg-${getProgressColor().replace("#", "")} rounded-full transition-all duration-300`}
                        style={{ width: `${downloadInfo?.completed || 0}%` }}
                    ></div>
                </div>

                {downloadInfo?.completed === -1 && (
                    <button
                        onClick={handleRetry}
                        className="mt-2 text-xs text-[#ee1086] hover:underline"
                    >
                        Retry
                    </button>
                )}

                {downloadInfo?.completed === 100 && (
                    <button
                        onClick={handlePlay}
                        className="mt-2 flex items-center gap-1 rounded bg-neutral-700/50 px-2 py-0.5 text-xs text-white hover:bg-neutral-700"
                    >
                        <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                        Play
                    </button>
                )}
            </div>
        </div>
    );
}
