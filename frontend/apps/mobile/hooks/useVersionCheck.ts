import { useEffect, useState } from "react";
import { z } from "zod";
import { apiGet } from "@/lib/api";
import { APP_VERSION } from "@/constants/version";

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
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [apkUrl, setApkUrl] = useState<string | null>(null);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    useEffect(() => {
        apiGet("/version/latest", LatestVersionSchema)
            .then((data) => {
                if (isNewerVersion(data.version, APP_VERSION)) {
                    setUpdateAvailable(true);
                    setApkUrl(data.apkUrl);
                    setLatestVersion(data.version);
                }
            })
            .catch(() => {
                // Silently ignore — no update check should not break the app
            });
    }, []);

    return { updateAvailable, apkUrl, latestVersion };
}
