import { useCallback, useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import {
    DownloadsResponseSchema,
    EWebSocketMessage,
    MediaResponseSchema,
    OkResponseSchema,
    StartDownloadRequestSchema,
    StartDownloadResponseSchema,
} from "@rockit/shared";
import type { DownloadProgressMessage } from "@rockit/shared";
import { apiGet, apiPost } from "@/lib/api";
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

    const fetchDownloads = useCallback(async () => {
        const data = await apiGet(
            "/downloader/downloads",
            DownloadsResponseSchema
        );
        const downloadGroups = data.downloads || [];
        const flatDownloads: DownloadInfo[] = [];
        for (const group of downloadGroups) {
            for (const item of group.items || []) {
                flatDownloads.push({
                    publicId: item.publicId,
                    groupId: group.publicId,
                    title: item.name,
                    subtitle: item.subtitle ?? null,
                    imageUrl: item.imageUrl ?? null,
                    status: item.message,
                    completed: item.message === "Done" ? 100 : item.completed,
                    message: item.message,
                    dateAdded: item.dateAdded ?? "",
                });
            }
        }
        setDownloads(flatDownloads);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const handleDownloadProgress = (data: DownloadProgressMessage) => {
            if (cancelled) return;
            setDownloads((prev) => {
                const existing = prev.find((d) => d.publicId === data.publicId);
                const message = data.progress >= 100 ? "Done" : data.message;
                const completed = data.progress >= 100 ? 100 : data.progress;

                if (existing) {
                    return prev.map((d) =>
                        d.publicId === data.publicId
                            ? {
                                  ...d,
                                  title: data.title || d.title,
                                  subtitle: data.subTitle || d.subtitle,
                                  status: message,
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
                        title: data.title || data.publicId,
                        subtitle: data.subTitle || null,
                        imageUrl: null,
                        status: message,
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
            const media = await apiGet(
                `/media/url/add?url=${encodeURIComponent(url)}`,
                MediaResponseSchema
            );
            const publicId = media.publicId;

            await apiPost(
                "/downloader/start-downloads",
                StartDownloadRequestSchema,
                { ids: [publicId], title: "Download" },
                StartDownloadResponseSchema
            );
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
            await apiPost(
                `/downloader/downloads/${groupId}/seen`,
                StartDownloadRequestSchema,
                { ids: [], title: "" },
                OkResponseSchema
            );
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
                await apiPost(
                    `/downloader/downloads/${groupId}/seen`,
                    StartDownloadRequestSchema,
                    { ids: [], title: "" },
                    OkResponseSchema
                );
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
