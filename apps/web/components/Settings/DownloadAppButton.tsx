"use client";

import { JSX, useEffect, useState } from "react";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { CloudOff, Download, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DownloadAppButton(): JSX.Element {
    const $vocabulary = useVocabulary();
    const $network = useNetworkStatus();
    const [swReady, setSwReady] = useState(false);

    const release = useAsyncResource(async () => {
        const response = await Http.getLatestAndroidRelease();
        if (!response.isOk()) throw new Error(response.message);
        return response.result.apk;
    }, "main-android-release");

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.serviceWorker)
            return;
        navigator.serviceWorker.ready.then((): void => setSwReady(true));
    }, []);

    return (
        <div className="flex flex-col gap-2">
            {release.data && !release.loading ? (
                <a
                    href={release.data.apkUrl}
                    referrerPolicy="no-referrer"
                    className="bg-primary text-primary-foreground hover:bg-brand-mid inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
                >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {$vocabulary.ANDROID_RELEASE_DOWNLOAD.replace(
                        "{build}",
                        String(release.data.buildNumber)
                    )}
                </a>
            ) : release.loading ? (
                <p role="status" className="text-muted-foreground text-sm">
                    {$vocabulary.ANDROID_RELEASE_CHECKING}
                </p>
            ) : (
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                    <p role="status">
                        {$vocabulary.ANDROID_RELEASE_UNAVAILABLE}
                    </p>
                    {release.error && (
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => void release.refresh()}
                        >
                            {$vocabulary.RETRY}
                        </button>
                    )}
                </div>
            )}
            <div className="bg-muted text-foreground-strong flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                {$network === "online" ? (
                    <Wifi className="text-success-foreground h-4 w-4" />
                ) : (
                    <CloudOff className="text-muted-foreground h-4 w-4" />
                )}
                <span>
                    {swReady
                        ? $vocabulary.APP_AVAILABLE_OFFLINE
                        : $vocabulary.APP_OFFLINE_UNAVAILABLE}
                </span>
            </div>
        </div>
    );
}
