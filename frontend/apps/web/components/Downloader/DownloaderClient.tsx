"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { DownloadItemResponse, DownloadProgressMessage } from "@/dto";
import { EWebSocketMessage } from "@rockit/packages/shared";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadEmptyState from "@/components/Downloader/DownloadEmptyState";
import DownloadFilterTabs, {
    type DownloadFilter,
} from "@/components/Downloader/DownloadFilterTabs";
import DownloadGroupSection from "@/components/Downloader/DownloadGroupSection";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadSkeleton from "@/components/Downloader/DownloadSkeleton";
import DownloadStats from "@/components/Downloader/DownloadStats";

function matchesFilter(
    item: DownloadItemResponse,
    filter: DownloadFilter
): boolean {
    if (filter === "all") return true;
    if (filter === "completed") return item.status === "COMPLETED";
    if (filter === "failed") return item.status === "FAILED";
    return item.status !== "COMPLETED" && item.status !== "FAILED";
}

export default function DownloaderClient(): JSX.Element {
    const { data, loading } = useFetch(Http.getDownloads);
    const [liveProgress, setLiveProgress] = useState<
        Record<string, Partial<DownloadItemResponse>>
    >({});
    const [filter, setFilter] = useState<DownloadFilter>("all");

    useEffect((): (() => void) => {
        const handleProgress = (msg: DownloadProgressMessage): void => {
            setLiveProgress((prev) => ({
                ...prev,
                [msg.publicId]: msg,
            }));
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
    }, []);

    const groups = useMemo(() => {
        if (!data) return [];
        return data.downloads.map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                ...liveProgress[item.publicId],
            })),
        }));
    }, [data, liveProgress]);

    const filteredGroups = useMemo(
        () =>
            groups
                .map((g) => ({
                    ...g,
                    items: g.items.filter((i) => matchesFilter(i, filter)),
                }))
                .filter((g) => g.items.length > 0),
        [groups, filter]
    );

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

    if (loading) return <DownloadSkeleton />;

    return (
        <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
            <header className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Descargas</h1>
                    <p className="text-sm text-neutral-400">
                        Gestiona y sigue tus descargas de música y vídeo
                    </p>
                </div>
                <DownloadInputBar onSubmit={startDownload} />
            </header>

            <DownloadStats groups={groups} />

            {groups.length === 0 ? (
                <DownloadEmptyState />
            ) : (
                <>
                    <DownloadFilterTabs
                        value={filter}
                        onChange={setFilter}
                        groups={groups}
                    />
                    <div className="space-y-8">
                        {filteredGroups.map((group) => (
                            <DownloadGroupSection
                                key={group.publicId}
                                group={group}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
