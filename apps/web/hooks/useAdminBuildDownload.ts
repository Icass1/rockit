"use client";

import { useEffect, useRef, useState } from "react";
import type { AndroidBuildResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export function useAdminBuildDownload(): {
    download: (build: AndroidBuildResponse) => Promise<void>;
    downloading: number | null;
    error: string | null;
} {
    const v = useVocabulary();
    const session = useStore(rockIt.userManager.sessionAtom);
    const controller = useRef<AbortController | null>(null);
    const [downloading, setDownloading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(
        () => () => {
            controller.current?.abort();
        },
        [session]
    );
    const download = async (build: AndroidBuildResponse): Promise<void> => {
        controller.current?.abort();
        const request = new AbortController();
        controller.current = request;
        setDownloading(build.runId);
        setError(null);
        const response = await Http.downloadBinary(
            `/admin/builds/android/${build.runId}/download`,
            undefined,
            request.signal
        );
        if (
            request.signal.aborted ||
            session !== rockIt.userManager.sessionAtom.get()
        ) {
            if (controller.current === request) setDownloading(null);
            return;
        }
        setDownloading(null);
        if (
            !response.isOk() ||
            response.result.contentType !==
                "application/vnd.android.package-archive"
        ) {
            const key = response.detail;
            setError(
                typeof key === "string" && Object.hasOwn(v, key)
                    ? v[key as keyof typeof v]
                    : v.ADMIN_ANDROID_DOWNLOAD_FAILED
            );
            return;
        }
        const url = URL.createObjectURL(response.result.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = response.result.filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
            anchor.remove();
            URL.revokeObjectURL(url);
        }, 1000);
    };
    return { download, downloading, error };
}
