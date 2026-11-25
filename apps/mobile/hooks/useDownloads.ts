import { useCallback, useEffect, useRef, useState } from "react";
import type {
    DownloadItemResponse,
    DownloadProgressMessage,
} from "@rockit/shared";
import { EWebSocketMessage } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme } from "@rockit/ui";
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
    status: DownloadItemResponse["status"];
    completed: number;
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
    const theme = useDesignTheme();
    const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
    const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
    const actionsInFlight = useRef(new Set<string>());
    const removed = useRef(new Set<string>());
    const cancelledDownloads = useRef(new Set<string>());
    const { vocabulary } = useVocabulary();

    const fetchDownloads = useCallback(async () => {
        const response = await Http.getDownloads(true);
        if (!response.isOk()) {
            toasterManager.notifyError(vocabulary.ERROR_GETTING_DOWNLOADS);
            return;
        }

        const downloadGroups = response.result.downloads || [];
        const flatDownloads: DownloadInfo[] = [];
        for (const group of downloadGroups) {
            for (const item of group.items || []) {
                if (removed.current.has(item.publicId)) continue;
                const cancelled = cancelledDownloads.current.has(item.publicId);
                flatDownloads.push({
                    publicId: item.publicId,
                    groupId: group.publicId,
                    title: item.name,
                    subtitle: item.subtitle ?? null,
                    imageUrl: item.imageUrl ?? null,
                    status: cancelled ? "CANCELLED" : item.status,
                    completed: cancelled ? 0 : item.progress,
                    dateAdded: item.dateStarted ?? "",
                });
            }
        }
        setDownloads(flatDownloads);
    }, [vocabulary.ERROR_GETTING_DOWNLOADS]);

    useEffect(() => {
        let cancelled = false;

        const handleDownloadProgress = (data: DownloadProgressMessage) => {
            if (
                cancelled ||
                removed.current.has(data.publicId) ||
                cancelledDownloads.current.has(data.publicId)
            )
                return;
            setDownloads((prev) => {
                const existing = prev.find((d) => d.publicId === data.publicId);
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
            const addResponse = await Http.addFromUrlAsync({
                url,
                addToLibrary: true,
                addToPlaylist: false,
                playlistPublicId: null,
            });

            if (!addResponse.isOk()) {
                console.error(addResponse.message, addResponse.detail);
                toasterManager.notifyError(vocabulary.ERROR_STARTING_DOWNLOAD);
                return;
            }

            const publicId = addResponse.result.data.publicId;

            await Http.startDownload({
                replaceExisting: false,
                ids: [publicId],
                title: vocabulary.DOWNLOADS,
            });
            await fetchDownloads();
            return { ok: true };
        } catch {
            return { ok: false, status: 400, message: vocabulary.ERROR };
        }
    };

    const clearCompleted = async () => {
        const completedGroups = new Set(
            downloads
                .filter((d) => d.status === "COMPLETED" && d.groupId)
                .map((d) => d.groupId)
        );
        for (const groupId of completedGroups) {
            await Http.markDownloadSeen(groupId);
        }
        setDownloads((prev) => prev.filter((d) => d.status !== "COMPLETED"));
    };

    const clearFailed = async () => {
        const failedGroups = new Set(
            downloads
                .filter((d) => d.status === "FAILED" && d.groupId)
                .map((d) => d.groupId)
        );
        for (const groupId of failedGroups) {
            try {
                await Http.markDownloadSeen(groupId);
            } catch {
                // Ignore API errors, filter locally anyway
            }
        }
        setDownloads((prev) => prev.filter((d) => d.status !== "FAILED"));
    };

    const runAction = async (publicId: string, action: "cancel" | "delete") => {
        if (actionsInFlight.current.has(publicId)) return;
        actionsInFlight.current.add(publicId);
        setPending(new Set(actionsInFlight.current));
        try {
            const response = await (action === "cancel"
                ? Http.cancelDownload(publicId)
                : Http.deleteDownload(publicId));
            if (!response.isOk()) {
                toasterManager.notifyError(vocabulary.ERROR);
                return;
            }
            if (action === "cancel") {
                cancelledDownloads.current.add(publicId);
                setDownloads((prev) =>
                    prev.map((item) =>
                        item.publicId === publicId
                            ? { ...item, status: "CANCELLED", completed: 0 }
                            : item
                    )
                );
            } else {
                cancelledDownloads.current.delete(publicId);
                removed.current.add(publicId);
                setDownloads((prev) =>
                    prev.filter((item) => item.publicId !== publicId)
                );
            }
        } catch {
            toasterManager.notifyError(vocabulary.ERROR);
        } finally {
            actionsInFlight.current.delete(publicId);
            setPending(new Set(actionsInFlight.current));
        }
    };

    const active = downloads.filter(
        (d) =>
            d.status !== "COMPLETED" &&
            d.status !== "FAILED" &&
            d.status !== "CANCELLED"
    );
    const completed = downloads.filter((d) => d.status === "COMPLETED");
    const failed = downloads.filter((d) => d.status === "FAILED");
    const cancelled = downloads.filter((d) => d.status === "CANCELLED");

    const groups: DownloadGroup[] = [
        {
            id: "active",
            label: vocabulary.ACTIVE,
            items: active,
            isOpen: true,
            color: theme.colors.primary,
            badgeColor: withAlpha(theme.colors.primary, 0.15),
        },
        {
            id: "completed",
            label: vocabulary.COMPLETED,
            items: completed,
            isOpen: false,
            color: theme.colors.success,
            badgeColor: withAlpha(theme.colors.success, 0.15),
        },
        {
            id: "failed",
            label: vocabulary.FAILED,
            items: failed,
            isOpen: true,
            color: theme.colors.destructive,
            badgeColor: withAlpha(theme.colors.destructive, 0.15),
        },
        {
            id: "cancelled",
            label: vocabulary.DOWNLOAD_CANCELLED,
            items: cancelled,
            isOpen: true,
            color: theme.legacy.gray400,
            badgeColor: withAlpha(theme.legacy.gray400, 0.15),
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
        pending,
        runAction,
    };
}
