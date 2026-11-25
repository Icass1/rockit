"use client";

import { useEffect, useState, type JSX } from "react";
import type { AndroidBuildHistoryResponse, AndroidBuildResponse } from "@/dto";
import {
    Check,
    Copy,
    Download,
    GitBranch,
    Loader2,
    RefreshCw,
    Smartphone,
} from "lucide-react";
import { useAdminBuildDownload } from "@/hooks/useAdminBuildDownload";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function AdminAndroidBuilds(): JSX.Element {
    const v = useVocabulary();
    const [history, setHistory] = useState<AndroidBuildHistoryResponse>();
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [visible, setVisible] = useState(6);
    const downloads = useAdminBuildDownload();
    const [copying, setCopying] = useState<number>();
    const [copyStatus, setCopyStatus] = useState<"copied" | "error">();
    const [manualLink, setManualLink] = useState<string>();
    useEffect(() => {
        let active = true;
        void Http.getAndroidBuildHistory()
            .then((result) => {
                if (active)
                    setHistory(result.isOk() ? result.result : undefined);
            })
            .catch(() => {
                if (active) setHistory(undefined);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [reload]);
    const status = (build: AndroidBuildResponse): string =>
        build.expired
            ? v.ADMIN_ANDROID_EXPIRED
            : build.status !== "completed"
              ? v.ADMIN_ANDROID_PENDING
              : build.conclusion === "success"
                ? v.ADMIN_ANDROID_SUCCESS
                : build.conclusion === "cancelled" ||
                    build.conclusion === "skipped"
                  ? v.ADMIN_ANDROID_CANCELLED
                  : v.ADMIN_ANDROID_FAILED;
    const latest = history?.builds.find(
        (build) => build.artifactUrl && !build.expired
    );
    const copyLink = async (build: AndroidBuildResponse): Promise<void> => {
        setCopying(build.runId);
        setCopyStatus(undefined);
        setManualLink(undefined);
        const link = Http.shareAndroidBuild(String(build.runId)).then(
            (result) => {
                if (!result.isOk()) throw new Error();
                return result.result.url;
            }
        );
        try {
            // Safari requires the clipboard write to start during the click.
            const clipboard = navigator.clipboard;
            if (clipboard?.write && typeof ClipboardItem !== "undefined") {
                const contents = link.then(
                    (url) => new Blob([url], { type: "text/plain" })
                );
                const write = async (): Promise<void> => {
                    await clipboard.write([
                        new ClipboardItem({ "text/plain": contents }),
                    ]);
                };
                await Promise.all([contents, write()]);
            } else {
                await clipboard.writeText(await link);
            }
            setCopyStatus("copied");
        } catch {
            try {
                setManualLink(await link);
            } catch {
                setCopyStatus("error");
            }
        } finally {
            setCopying(undefined);
        }
    };

    const copyAction = (
        build: AndroidBuildResponse,
        labeled = false
    ): JSX.Element => (
        <button
            type="button"
            aria-label={v.SHARING_COPY_LINK}
            title={v.SHARING_COPY_LINK}
            disabled={!history?.downloadsEnabled || copying !== undefined}
            onClick={() => void copyLink(build)}
            className="text-foreground-strong hover:bg-muted border-border-subtle inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:opacity-50"
        >
            {copying === build.runId ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
            {labeled && v.SHARING_COPY_LINK}
        </button>
    );
    const downloadAction = (
        build: AndroidBuildResponse,
        primary = false
    ): JSX.Element => {
        const busy = downloads.downloading === build.runId;
        return (
            <button
                type="button"
                onClick={() => void downloads.download(build)}
                disabled={
                    !history?.downloadsEnabled || downloads.downloading !== null
                }
                className={
                    primary
                        ? "bg-primary text-primary-foreground hover:bg-brand-mid inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition disabled:opacity-50"
                        : "text-foreground-strong hover:bg-muted border-border-subtle inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                }
            >
                {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                {v.ADMIN_ANDROID_DOWNLOAD_APK}
            </button>
        );
    };
    return (
        <section className="space-y-6" aria-busy={loading}>
            {copyStatus && (
                <p role="status" className="text-muted-foreground text-sm">
                    {copyStatus === "copied"
                        ? v.ADMIN_ANDROID_LINK_COPIED
                        : v.SHARING_LINK_ERROR}
                </p>
            )}
            {manualLink && (
                <input
                    aria-label={v.SHARING_COPY_LINK}
                    className="border-border-subtle bg-background w-full rounded-lg border px-3 py-2 text-sm"
                    value={manualLink}
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                />
            )}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-subtle-foreground mb-1 text-xs font-medium tracking-widest uppercase">
                        {v.ADMIN_ANDROID_SOURCE}
                    </p>
                    <h2 className="text-foreground-strong text-2xl font-semibold tracking-tight">
                        {v.ADMIN_ANDROID_HISTORY}
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                        {v.ADMIN_ANDROID_HISTORY_DESC}
                    </p>
                </div>
                <button
                    type="button"
                    disabled={loading}
                    aria-label={v.RETRY}
                    onClick={() => {
                        setLoading(true);
                        setReload((value) => value + 1);
                    }}
                    className="text-muted-foreground hover:bg-muted rounded-lg p-3 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-5 w-5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                    />
                </button>
            </div>
            {downloads.error && (
                <p role="alert" className="text-destructive-soft text-sm">
                    {downloads.error}
                </p>
            )}
            {!loading &&
                history?.availability === "available" &&
                !history.downloadsEnabled && (
                    <p role="status" className="text-warning text-sm">
                        {v.ADMIN_ANDROID_DOWNLOAD_CONFIG}
                    </p>
                )}
            {loading && !history ? (
                <div className="skeleton h-44 rounded-xl" />
            ) : !history || history.availability === "unavailable" ? (
                <p
                    role="status"
                    className="text-muted-foreground border-border-subtle border-y py-8 text-sm leading-relaxed"
                >
                    {v.ADMIN_ANDROID_HISTORY_UNAVAILABLE}
                </p>
            ) : history.builds.length === 0 ? (
                <p className="text-muted-foreground py-8 text-sm">
                    {v.ADMIN_ANDROID_EMPTY}
                </p>
            ) : (
                <>
                    {latest && (
                        <article className="border-primary/20 bg-primary/5 flex flex-col justify-between gap-6 rounded-xl border p-6 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-4">
                                <div className="text-primary bg-primary/10 hidden h-16 w-16 items-center justify-center rounded-xl sm:flex">
                                    <Smartphone className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-success mb-1 flex items-center gap-1.5 text-xs font-medium">
                                        <Check className="h-3.5 w-3.5" />
                                        {v.ADMIN_ANDROID_LATEST}
                                    </p>
                                    <h3 className="text-foreground-strong text-2xl font-semibold">
                                        {v.ADMIN_ANDROID_RELEASE_NAME}{" "}
                                        <span className="text-muted-foreground">
                                            #{latest.number}
                                        </span>
                                    </h3>
                                    <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                                        <GitBranch className="h-3.5 w-3.5" />
                                        {latest.branch}
                                        <span aria-hidden="true">·</span>
                                        <code>{latest.commit}</code>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                                <div className="flex flex-wrap gap-2">
                                    {downloadAction(latest, true)}
                                    {copyAction(latest, true)}
                                </div>
                                {latest.expiresAt && (
                                    <p className="text-subtle-foreground text-xs">
                                        {v.ADMIN_ANDROID_EXPIRES.replace(
                                            "{date}",
                                            new Date(
                                                latest.expiresAt
                                            ).toLocaleDateString()
                                        )}
                                    </p>
                                )}
                            </div>
                        </article>
                    )}
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-foreground-strong text-sm font-medium">
                                {v.ADMIN_ANDROID_RECENT}
                            </h3>
                            <span className="text-subtle-foreground text-xs">
                                {history.builds.length}
                            </span>
                        </div>
                        <div className="border-border-subtle divide-border-subtle divide-y border-y">
                            {history.builds.slice(0, visible).map((build) => (
                                <article
                                    key={build.runId}
                                    className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 sm:grid-cols-[1fr_1fr_auto]"
                                >
                                    <div className="min-w-0">
                                        <p className="text-foreground-strong truncate text-sm font-medium">
                                            #{build.number}
                                            <span className="text-muted-foreground ml-3 text-xs font-normal">
                                                {build.branch}
                                            </span>
                                        </p>
                                        <p className="text-subtle-foreground mt-1.5 text-xs">
                                            <code>{build.commit}</code>
                                            <span aria-hidden="true"> · </span>
                                            <time dateTime={build.createdAt}>
                                                {new Date(
                                                    build.createdAt
                                                ).toLocaleDateString()}
                                            </time>
                                        </p>
                                    </div>
                                    <span
                                        className={`col-start-1 row-start-2 text-xs sm:col-start-auto sm:row-start-auto ${build.conclusion === "success" && !build.expired ? "text-success" : build.conclusion === "failure" ? "text-destructive-soft" : "text-subtle-foreground"}`}
                                    >
                                        {status(build)}
                                    </span>
                                    <div className="col-start-2 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                                        {build.artifactUrl && !build.expired ? (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {downloadAction(build)}
                                                {copyAction(build)}
                                            </div>
                                        ) : (
                                            <span className="text-subtle-foreground text-xs">
                                                {build.expired
                                                    ? v.ADMIN_ANDROID_EXPIRED
                                                    : v.ADMIN_ANDROID_NO_ARTIFACT}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                        {history.builds.length > visible && (
                            <button
                                type="button"
                                onClick={() => setVisible((value) => value + 6)}
                                className="text-muted-foreground hover:text-foreground-strong mt-4 min-h-11 text-sm"
                            >
                                {v.ADMIN_ANDROID_SHOW_MORE}
                            </button>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
