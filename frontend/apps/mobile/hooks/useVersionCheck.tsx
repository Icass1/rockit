import { useEffect, useState } from "react";
import { APP_VERSION } from "@/constants/version";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { useModal } from "@/lib/ModalContext";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import { UpdateModalContent } from "@/components/UpdateModal";

const LatestVersionSchema = z.object({
    version: z.string(),
    apkUrl: z.string(),
});

function isNewerVersion(remote: string, local: string): boolean {
    const remoteParts = remote.split(".").map(Number);
    const localParts = local.split(".").map(Number);
    const length = Math.max(remoteParts.length, localParts.length);

    for (let i = 0; i < length; i++) {
        const r = remoteParts[i] ?? 0;
        const l = localParts[i] ?? 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}

export function useVersionCheck() {
    const [apkUrl, setApkUrl] = useState<string | null>(null);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const { vocabulary } = useVocabulary();
    const { show } = useModal();

    useEffect(() => {
        apiFetch("/version/latest", LatestVersionSchema)
            .then((response) => {
                if (response.isOk()) {
                    if (isNewerVersion(response.result.version, APP_VERSION)) {
                        toasterManager.notifyInfo(
                            vocabulary.NEW_VERSION_AVAILABLE
                        );
                        setApkUrl(response.result.apkUrl);
                        setLatestVersion(response.result.version);
                        show({
                            title: "Update Available",
                            content: (
                                <UpdateModalContent
                                    apkUrl={response.result.apkUrl}
                                    latestVersion={response.result.version}
                                />
                            ),
                        });
                    }
                } else {
                    console.error(response.message, response.detail);
                }
            })
            .catch(() => {
                // Silently ignore — no update check should not break the app
            });
    }, [vocabulary.NEW_VERSION_AVAILABLE, show]);

    return { apkUrl, latestVersion };
}
