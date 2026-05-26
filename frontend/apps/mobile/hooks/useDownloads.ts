import { useCallback, useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import type { DownloadProgressMessage } from "@rockit/shared";
import { EWebSocketMessage } from "@rockit/shared";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import { webSocketManager } from "@/lib/webSocketManager";

export interface DownloadInfo {
    publicId: string;
    groupId: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    status: string;
    completed: number;
    message: string;
    dateAdded: string;
}

export interface DownloadGroup {
    id: string;
    label: string;
    items: DownloadInfo[];
    isOpen: boolean;
    color: string;
    badgeColor: string;
}

export function useDownloads() {
    const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
    const { vocabulary } = useVocabulary();

    const fetchDownloads = useCallback(async () => {
        const response = await Http.getDownloads();
        if (!response.isOk()) {
            toasterManager.notifyError(vocabulary.ERROR_GETTING_DOWNLOADS);
            return;
        }

        const downloadGroups = response.result.downloads || [];
        const flatDownloads: DownloadInfo[] = [];
        for (const group of downloadGroups) {
            for (const item of group.items || []) {
                const isDone =
                    item.progress >= 100 || item.status === "COMPLETED";
                const isError = item.status === "FAILED";
                flatDownloads.push({
                    publicId: item.publicId,
                    groupId: group.publicId,
                    title: item.name,
                    subtitle: item.subtitle ?? null,
                    imageUrl: item.imageUrl ?? null,
                    status: item.status,
                    completed: item.progress,
                    message: isDone ? "Done" : isError ? "Error" : item.status,
                    dateAdded: item.dateStarted ?? "",
                });
            }
        }
        setDownloads(flatDownloads);
    }, [vocabulary.ERROR_GETTING_DOWNLOADS]);

    useEffect(() => {
        let cancelled = false;

        const handleDownloadProgress = (data: DownloadProgressMessage) => {
            if (cancelled) return;
            setDownloads((prev) => {
                const existing = prev.find((d) => d.publicId === data.publicId);
                const message =
                    data.progress >= 100
                        ? "Done"
                        : data.status === "FAILED"
                          ? "Error"
                          : data.status;
                const completed = data.progress >= 100 ? 100 : data.progress;

                if (existing) {
                    return prev.map((d) =>
                        d.publicId === data.publicId
                            ? {
                                  ...d,
                                  title: data.name || d.title,
                                  subtitle: data.subtitle || d.subtitle,
                                  status: data.status,
                                  completed,
                                  message,
                              }
                            : d
                    );
                }
                if (!data.publicId) return prev;
                return [
                    ...prev,
                    {
                        publicId: data.publicId,
                        groupId: "",
                        title: data.name || data.publicId,
                        subtitle: data.subtitle || null,
                        imageUrl: null,
                        status: data.status,
                        completed,
                        message,
                        dateAdded: "",
                    },
                ];
            });
        };

        webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            handleDownloadProgress
        );

        fetchDownloads();

        return () => {
            cancelled = true;
            webSocketManager.offMessage(
                EWebSocketMessage.DownloadProgress,
                handleDownloadProgress
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startDownload = async (url: string) => {
        try {
            const addResponse = await Http.addFromUrl({
                url,
                addToLibrary: true,
                addToPlaylist: false,
                playlistPublicId: null,
            });

            if (!addResponse.isOk()) {
                console.error(addResponse.message, addResponse.detail);
                toasterManager.notifyError("Error starting download");
                return;
            }

            const publicId = addResponse.result.data.publicId;

            await Http.startDownload({
                ids: [publicId],
                title: "Download",
            });
            await fetchDownloads();
            return { ok: true };
        } catch {
            return { ok: false, status: 400, message: "Could not fetch media" };
        }
    };

    const clearCompleted = async () => {
        const completedGroups = new Set(
            downloads
                .filter((d) => d.completed === 100 && d.groupId)
                .map((d) => d.groupId)
        );
        for (const groupId of completedGroups) {
            await Http.markDownloadSeen(groupId);
        }
        setDownloads((prev) => prev.filter((d) => d.completed !== 100));
    };

    const clearFailed = async () => {
        const failedGroups = new Set(
            downloads
                .filter((d) => d.message === "Error" && d.groupId)
                .map((d) => d.groupId)
        );
        for (const groupId of failedGroups) {
            try {
                await Http.markDownloadSeen(groupId);
            } catch {
                // Ignore API errors, filter locally anyway
            }
        }
        setDownloads((prev) => prev.filter((d) => d.message !== "Error"));
    };

    const active = downloads.filter(
        (d) =>
            d.completed < 100 && d.message !== "Error" && d.message !== "Done"
    );
    const completed = downloads.filter(
        (d) => d.completed === 100 || d.message === "Done"
    );
    const failed = downloads.filter((d) => d.message === "Error");

    const groups: DownloadGroup[] = [
        {
            id: "active",
            label: "Active",
            items: active,
            isOpen: true,
            color: COLORS.accent,
            badgeColor: "rgba(238, 16, 134, 0.15)",
        },
        {
            id: "completed",
            label: "Completed",
            items: completed,
            isOpen: false,
            color: "#1cad60",
            badgeColor: "rgba(28, 173, 96, 0.15)",
        },
        {
            id: "failed",
            label: "Failed",
            items: failed,
            isOpen: true,
            color: "#c72e2e",
            badgeColor: "rgba(199, 46, 46, 0.15)",
        },
    ];

    return {
        downloads,
        groups,
        total: downloads.length,
        active,
        completed,
        failed,
        startDownload,
        clearCompleted,
        clearFailed,
    };
}
