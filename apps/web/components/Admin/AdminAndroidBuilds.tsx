"use client";

import { useEffect, useState, type JSX } from "react";
import type { AndroidBuildHistoryResponse } from "@/dto";
import { Download, ExternalLink, RefreshCw, Smartphone } from "lucide-react";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function AdminAndroidBuilds(): JSX.Element {
    const v = useVocabulary();
    const [history, setHistory] = useState<AndroidBuildHistoryResponse>();
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
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
    const status = (
        build: AndroidBuildHistoryResponse["builds"][number]
    ): string =>
        build.status !== "completed"
            ? v.ADMIN_ANDROID_PENDING
            : build.conclusion === "success"
              ? v.ADMIN_ANDROID_SUCCESS
              : build.conclusion === "cancelled" ||
                  build.conclusion === "skipped"
                ? v.ADMIN_ANDROID_CANCELLED
                : v.ADMIN_ANDROID_FAILED;
    return (
        <section className="mb-10 space-y-4" aria-busy={loading}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-foreground-strong flex items-center gap-2 text-2xl font-bold">
                        <Smartphone className="text-primary h-6 w-6" />
                        {v.ADMIN_ANDROID_HISTORY}
                    </h2>
                    <p className="text-subtle-foreground mt-1 text-sm">
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
                    className="hover:bg-muted rounded-lg p-3 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-5 w-5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                    />
                </button>
            </div>
            {loading ? (
                <p className="text-subtle-foreground text-sm">
                    {v.SEARCH_LOADING}
                </p>
            ) : !history || history.availability === "unavailable" ? (
                <p role="status" className="text-subtle-foreground text-sm">
                    {v.ADMIN_ANDROID_HISTORY_UNAVAILABLE}
                </p>
            ) : history.builds.length === 0 ? (
                <p className="text-subtle-foreground text-sm">
                    {v.ADMIN_ANDROID_EMPTY}
                </p>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {history.builds.map((build) => (
                        <article
                            key={build.runId}
                            className="bg-secondary border-border-subtle flex flex-col gap-3 rounded-xl border p-4"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <a
                                    href={build.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary text-foreground-strong font-semibold"
                                >
                                    #{build.number}{" "}
                                    <ExternalLink className="inline h-3 w-3" />
                                </a>
                                <span
                                    className={
                                        build.conclusion === "success"
                                            ? "text-success text-xs"
                                            : "text-subtle-foreground text-xs"
                                    }
                                >
                                    {status(build)}
                                </span>
                            </div>
                            <div className="text-subtle-foreground truncate text-sm">
                                {build.branch} · <code>{build.commit}</code>
                            </div>
                            <time
                                className="text-subtle-foreground text-xs"
                                dateTime={build.createdAt}
                            >
                                {new Date(build.createdAt).toLocaleString()}
                            </time>
                            {build.artifactUrl ? (
                                <a
                                    href={build.artifactUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary mt-auto flex items-center gap-2 text-sm font-medium"
                                >
                                    <Download className="h-4 w-4" />
                                    {v.DOWNLOAD}
                                </a>
                            ) : (
                                <p className="text-subtle-foreground mt-auto text-xs">
                                    {build.expired
                                        ? v.ADMIN_ANDROID_EXPIRED
                                        : v.ADMIN_ANDROID_NO_ARTIFACT}
                                </p>
                            )}
                            {build.expiresAt && !build.expired && (
                                <p className="text-subtle-foreground text-xs">
                                    {v.ADMIN_ANDROID_EXPIRES.replace(
                                        "{date}",
                                        new Date(
                                            build.expiresAt
                                        ).toLocaleString()
                                    )}
                                </p>
                            )}
                        </article>
                    ))}
                </div>
            )}
            {history && (
                <a
                    href={history.workflowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-2 text-sm"
                >
                    {v.ADMIN_ANDROID_WORKFLOW}
                    <ExternalLink className="h-4 w-4" />
                </a>
            )}
        </section>
    );
}
