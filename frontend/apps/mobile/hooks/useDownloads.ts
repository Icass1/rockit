import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import { StartDownloadRequestSchema, StartDownloadResponseSchema } from "@/dto";
import { z } from "zod";
import { apiFetch, BACKEND_URL } from "@/lib/api";

const ResponseSchema =
    StartDownloadResponseSchema as unknown as z.ZodType<unknown>;

export interface DownloadInfo {
    publicId: string;
    title: string;
    status: string;
    completed: number;
    message: string;
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
        const res = await apiFetch("/downloader/downloads");
        if (res.ok) {
            const data = await res.json();
            const downloadGroups = data.downloads || [];
            const flatDownloads: DownloadInfo[] = [];
            for (const group of downloadGroups) {
                for (const item of group.items || []) {
                    flatDownloads.push({
                        publicId: item.publicId,
                        title: item.name,
                        status: item.message,
                        completed: item.completed,
                        message: item.message,
                    });
                }
            }
            setDownloads(flatDownloads);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

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
                            if (existing) {
                                return prev.map((d) =>
                                    d.publicId === data.publicId
                                        ? {
                                              ...d,
                                              status: data.status,
                                              completed: data.progress,
                                              message: data.message,
                                          }
                                        : d
                                );
                            }
                            return [
                                ...prev,
                                {
                                    publicId: data.publicId,
                                    title: data.message,
                                    status: data.status,
                                    completed: data.progress,
                                    message: data.message,
                                },
                            ];
                        });
                    }
                } catch {
                    // ignore parse errors
                }
            };
        }

        init();

        return () => {
            cancelled = true;
            wsRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startDownload = async (url: string) => {
        const addRes = await apiFetch(
            `/media/url/add?url=${encodeURIComponent(url)}`
        );
        if (!(addRes as Response).ok) {
            return { ok: false, status: 400, message: "Could not fetch media" };
        }

        const media = await (addRes as Response).json();
        const publicId = media.publicId;

        const body = StartDownloadRequestSchema.parse({
            ids: [publicId],
            title: "Download",
        });
        const res = await apiFetch(
            "/downloader/start-downloads",
            ResponseSchema,
            {
                method: "POST",
                body: JSON.stringify(body),
            }
        );
        if ((res as Response).ok) {
            await fetchDownloads();
        }
        return res;
    };

    const clearCompleted = async () => {
        const completedIds = downloads
            .filter((d) => d.completed === 100)
            .map((d) => d.publicId);
        for (const id of completedIds) {
            await apiFetch(`/downloader/downloads/${id}/seen`, {
                method: "POST",
            });
        }
        setDownloads((prev) => prev.filter((d) => d.completed !== 100));
    };

    const active = downloads.filter(
        (d) => d.completed < 100 && d.message !== "Error"
    );
    const completed = downloads.filter((d) => d.completed === 100);
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
