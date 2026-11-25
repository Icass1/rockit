import { useEffect, useRef } from "react";
import { installedAndroidApkCode } from "@/constants/androidApk";
import { Http } from "@/lib/http";
import { useModal } from "@/lib/ModalContext";
import { useVocabulary } from "@/lib/vocabulary";
import { UpdateModalContent } from "@/components/UpdateModal";

export function useVersionCheck(): void {
    const { vocabulary } = useVocabulary();
    const { show } = useModal();
    const notified = useRef(false);
    const title = vocabulary.NEW_VERSION_AVAILABLE;

    useEffect(() => {
        const installed = installedAndroidApkCode;
        if (installed === null || notified.current) return;
        let cancelled = false;
        void Http.getLatestAndroidRelease()
            .then((response) => {
                if (cancelled || !response.isOk()) return;
                const apk = response.result.apk;
                if (
                    !apk ||
                    apk.versionCode === null ||
                    apk.versionCode <= installed
                )
                    return;
                notified.current = true;
                show({
                    title,
                    content: (
                        <UpdateModalContent
                            apkUrl={apk.apkUrl}
                            currentBuild={installed - 1}
                            latestBuild={apk.buildNumber}
                        />
                    ),
                });
            })
            .catch(() => {
                // An unavailable release feed must not interrupt startup.
            });
        return () => {
            cancelled = true;
        };
    }, [show, title]);
}
