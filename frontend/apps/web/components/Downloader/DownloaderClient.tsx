"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import DownloadLibrarySetting from "@/components/Downloader/DownloadLibrarySetting";
import { DownloadItemResponse } from "@/dto";
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
    const groups = useStore(rockIt.downloaderManager.groupsAtom);
    const loading = useStore(rockIt.downloaderManager.loadingAtom);
    const error = useStore(rockIt.downloaderManager.errorAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [filter, setFilter] = useState<DownloadFilter>("all");

    useEffect(() => {
        void rockIt.downloaderManager.init();
        void rockIt.downloaderManager.refreshAsync();
        const onFocus = (): void => {
            void rockIt.downloaderManager.refreshAsync();
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, []);

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
        const result = await Http.startDownloadFromUrl({
            url,
            addToLibrary: false,
            addToPlaylist: false,
            playlistPublicId: null,
        });
        if (!result.isOk())
            throw new Error(
                result.message || $vocabulary.ERROR_STARTING_DOWNLOAD
            );
        rockIt.notificationManager.notifySuccess($vocabulary.DOWNLOAD_STARTED);
        await rockIt.downloaderManager.refreshAsync();
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
                <DownloadLibrarySetting />
            </header>

            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 text-red-400"
                >
                    <span>{$vocabulary.ERROR_GETTING_DOWNLOADS}</span>
                    <button
                        onClick={() =>
                            void rockIt.downloaderManager.refreshAsync()
                        }
                    >
                        {$vocabulary.RETRY}
                    </button>
                </div>
            )}
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
