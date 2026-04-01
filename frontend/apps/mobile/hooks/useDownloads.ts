import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import {
    BaseSongWithAlbumResponseSchema,
    DownloadsResponseSchema,
    OkResponseSchema,
    StartDownloadRequestSchema,
    StartDownloadResponseSchema,
} from "@rockit/shared";
import { apiGet, apiPost, BACKEND_URL } from "@/lib/api";

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
    const wsRef = useRef<WebSocket | null>(null);

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
        let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

        async function init() {
            if (!cancelled) {
                await fetchDownloads();
            }

            const protocol = BACKEND_URL.startsWith("https") ? "wss" : "ws";
            const wsUrl = `${protocol}://${BACKEND_URL.replace(/^https?:\/\//, "")}/ws`;

            const wsConnection = new WebSocket(wsUrl);
            wsRef.current = wsConnection;

            wsConnection.onmessage = (event) => {
                if (cancelled) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "download_progress") {
                        setDownloads((prev) => {
                            const existing = prev.find(
                                (d) => d.publicId === data.publicId
                            );
                            const message =
                                data.progress >= 100 ? "Done" : data.message;
                            const completed =
                                data.progress >= 100 ? 100 : data.progress;

                            if (existing) {
                                return prev.map((d) =>
                                    d.publicId === data.publicId
                                        ? {
                                              ...d,
                                              status: message,
                                              completed,
                                              message,
                                          }
                                        : d
                                );
                            }
                            return [
                                ...prev,
                                {
                                    publicId: data.publicId,
                                    groupId: "",
                                    title: data.message,
                                    subtitle: null,
                                    imageUrl: null,
                                    status: message,
                                    completed,
                                    message,
                                    dateAdded: "",
                                },
                            ];
                        });
                    }
                } catch {
                    // ignore parse errors
                }
            };

            wsConnection.onclose = () => {
                if (cancelled) return;
                reconnectTimeout = setTimeout(() => {
                    if (!cancelled) {
                        init();
                    }
                }, 3000);
            };

            wsConnection.onerror = () => {
                wsConnection.close();
            };
        }

        init();

        return () => {
            cancelled = true;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            wsRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startDownload = async (url: string) => {
        try {
            const media = await apiGet(
                `/media/url/add?url=${encodeURIComponent(url)}`,
                BaseSongWithAlbumResponseSchema
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
    };
}
