"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { DownloadItemResponse, DownloadProgressMessage } from "@/dto";
import { useStore } from "@nanostores/react";
import { EWebSocketMessage } from "@rockit/packages/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadItem({
    download: _download,
}: {
    download: DownloadItemResponse;
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [downloadInfo, setDownloadInfo] = useState<DownloadProgressMessage>({
        type: "download_progress",
        ..._download,
    });

    useEffect((): (() => void) => {
        const handleProgress = (e: DownloadProgressMessage): void => {
            if (e.publicId === _download.publicId) setDownloadInfo(e as never);
        };

        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            handleProgress
        );

        return () => {
            rockIt.webSocketManager.offMessage(
                EWebSocketMessage.DownloadProgress,
                handleProgress
            );
        };
    }, [_download]);

    const getProgressColor = (): string => {
        // if (!downloadInfo) return "#ee1086"; // pink for downloading
        // if (downloadInfo.completed === 100) return "#1cad60"; // green
        // if (downloadInfo.completed === -1) return "#c72e2e"; // red
        return "#ee1086"; // pink for downloading
    };

    const handleRetry = async (): Promise<void> => {
        // try {
        //     await rockIt.downloaderManager.startDownloadAsync(
        //         download.providerUrl,
        //         download.name
        //     );
        // } catch (err) {
        //     console.error("Retry failed:", err);
        // }
    };

    const handlePlay = (): void => {
        // if (downloadInfo?.completed === 100) {
        //     const playable = [$download].filter(isSongWithAlbum);
        //     if (playable.length > 0) {
        //         rockIt.queueManager.setMedia(playable, "");
        //         rockIt.queueManager.moveToMedia($download.publicId);
        //         rockIt.mediaPlayerManager.play();
        //     }
        // }
    };

    return (
        <div className="flex items-start gap-4 border-b border-neutral-700 py-3">
            <div className="shrink-0">
                {downloadInfo.imageUrl ? (
                    <Image
                        width={300}
                        height={300}
                        className="h-12 w-12 rounded object-cover"
                        src={downloadInfo.imageUrl}
                        alt={`Cover of ${downloadInfo.name}`}
                    />
                ) : (
                    <div className="h-12 w-12 bg-red-400"></div>
                )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between">
                    <h3 className="max-w-50 truncate font-semibold text-white">
                        {downloadInfo.name}
                    </h3>
                    <span className="text-xs text-neutral-400">
                        {$vocabulary[downloadInfo.status]}
                    </span>
                </div>

                {/* <div className="flex items-center gap-2 text-sm text-neutral-400">
                    {download.artists.map(
                        (artist, index): JSX.Element => (
                            <>
                                <span
                                    key={index}
                                    className="max-w-37.5 truncate"
                                >
                                    {artist.name}
                                </span>
                                {index < $download.length - 1 && ", "}
                            </>
                        )
                    )}
                </div> */}

                <div className="h-2.5 w-full rounded-full bg-neutral-700">
                    <div
                        className={`h-2.5 bg-${getProgressColor().replace("#", "")} rounded-full transition-all duration-300`}
                        style={{
                            width: `${downloadInfo.progress}%`,
                        }}
                    />
                </div>

                {downloadInfo.progress === -1 && (
                    <button
                        onClick={handleRetry}
                        className="mt-2 text-xs text-[#ee1086] hover:underline"
                    >
                        {$vocabulary.RETRY}
                    </button>
                )}

                {downloadInfo.progress >= 100 && (
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
                        {$vocabulary.PLAY}
                    </button>
                )}
            </div>
        </div>
    );
}
