"use client";
import { useEffect, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { DownloadKind } from "@/models/types/downloadBrowser";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadLibrarySetting from "@/components/Downloader/DownloadLibrarySetting";
import DownloadFilterTabs from "@/components/Downloader/DownloadFilterTabs";
import DownloadGroupSection from "@/components/Downloader/DownloadGroupSection";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadSkeleton from "@/components/Downloader/DownloadSkeleton";
import DownloadStats from "@/components/Downloader/DownloadStats";

export default function DownloaderClient(): JSX.Element {
    const groups = useStore(rockIt.downloaderManager.groupsAtom);
    const totals = useStore(rockIt.downloaderManager.totalsAtom);
    const view = useStore(rockIt.downloaderManager.viewAtom);
    const loading = useStore(rockIt.downloaderManager.loadingAtom);
    const refreshing = useStore(rockIt.downloaderManager.refreshingAtom);
    const error = useStore(rockIt.downloaderManager.errorAtom);
    const hasMore = useStore(rockIt.downloaderManager.hasMoreAtom);
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [search, setSearch] = useState(view.query);
    useEffect(() => {
        void rockIt.downloaderManager.init();
        const stop = rockIt.downloaderManager.watch();
        const focus = (): void => {
            void rockIt.downloaderManager.refreshAsync();
        };
        window.addEventListener("focus", focus);
        return () => {
            stop();
            window.removeEventListener("focus", focus);
        };
    }, []);
    useEffect(() => {
        if (search.trim() === view.query) return;
        const timer = setTimeout(() => {
            void rockIt.downloaderManager.setViewAsync({
                query: search.trim(),
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, view.query]);
    const startDownload = async (url: string): Promise<void> => {
        const result = await Http.startDownloadFromUrl({
            url,
            addToLibrary: false,
            addToPlaylist: false,
            playlistPublicId: null,
        });
        if (!result.isOk())
            throw new Error(result.message || v.ERROR_STARTING_DOWNLOAD);
        rockIt.notificationManager.notifySuccess(v.DOWNLOAD_STARTED);
        setSearch("");
        await rockIt.downloaderManager.setViewAsync({
            page: 0,
            query: "",
            status: "all",
            kind: "all",
        });
    };
    if (loading) return <DownloadSkeleton />;
    const buttonClass =
        "rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 disabled:opacity-40";
    return (
        <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-10">
            <header className="space-y-4">
                <h1 className="text-2xl font-bold text-white">{v.DOWNLOADS}</h1>
                <DownloadInputBar onSubmit={startDownload} />
                <DownloadLibrarySetting />
            </header>
            <DownloadStats totals={totals} />
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    maxLength={200}
                    aria-label={v.DOWNLOADER_SEARCH}
                    placeholder={v.DOWNLOADER_SEARCH}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                />
                <select
                    aria-label={v.DOWNLOADS}
                    value={view.kind}
                    onChange={(event) =>
                        void rockIt.downloaderManager.setViewAsync({
                            kind: event.target.value as DownloadKind,
                        })
                    }
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
                >
                    <option value="all">{v.ALL}</option>
                    <option value="album">{v.ALBUMS}</option>
                    <option value="playlist">{v.PLAYLISTS}</option>
                </select>
                {refreshing && (
                    <LoaderCircle
                        role="status"
                        aria-label={v.DOWNLOADING}
                        size={18}
                        className="animate-spin text-neutral-400"
                    />
                )}
            </div>
            <DownloadFilterTabs
                value={view.status}
                totals={totals}
                onChange={(status) =>
                    void rockIt.downloaderManager.setViewAsync({ status })
                }
            />
            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 text-red-400"
                >
                    <span>{v.ERROR_GETTING_DOWNLOADS}</span>
                    <button
                        className={buttonClass}
                        onClick={() =>
                            void rockIt.downloaderManager.refreshAsync()
                        }
                    >
                        {v.RETRY}
                    </button>
                </div>
            )}
            <div className="space-y-5" aria-busy={refreshing}>
                {groups.map((group) => (
                    <DownloadGroupSection key={group.publicId} group={group} />
                ))}
            </div>
            {!groups.length && !refreshing && !error && (
                <p className="py-12 text-center text-neutral-400">
                    {v.NO_RESULTS}
                </p>
            )}
            <nav
                aria-label={v.DOWNLOADS}
                className="flex items-center justify-center gap-4 text-sm text-neutral-400"
            >
                <button
                    className={buttonClass}
                    aria-label={v.DOWNLOADER_PREVIOUS_PAGE}
                    disabled={view.page === 0 || refreshing}
                    onClick={() =>
                        void rockIt.downloaderManager.setViewAsync({
                            page: view.page - 1,
                        })
                    }
                >
                    <ChevronLeft size={18} />
                </button>
                <span>
                    {v.DOWNLOADER_PAGE} {view.page + 1}
                </span>
                <button
                    className={buttonClass}
                    aria-label={v.DOWNLOADER_NEXT_PAGE}
                    disabled={!hasMore || refreshing}
                    onClick={() =>
                        void rockIt.downloaderManager.setViewAsync({
                            page: view.page + 1,
                        })
                    }
                >
                    <ChevronRight size={18} />
                </button>
            </nav>
        </div>
    );
}
