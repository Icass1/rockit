import {
    BACKEND_URL,
    BaseHttp,
    HttpResult,
    isOfflineMetadataPath,
    OFFLINE_METADATA_POLICY,
    type IApiFetchOptions,
} from "@rockit/shared";
import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import {
    clearSessionCookie,
    getSessionCacheScope,
    getSessionCookie,
    saveSessionCookie,
    sessionGeneration,
} from "@/lib/api";

export class Http extends BaseHttp {
    protected static override async baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        const cookie = await getSessionCookie();
        const headers = new Headers(options.headers);
        headers.set("Content-Type", "application/json");
        if (cookie) headers.set("Cookie", `session_id=${cookie}`);
        const response = await fetch(`${BACKEND_URL}${path}`, {
            ...options,
            headers,
            credentials: "include",
        });
        await saveSessionCookie(response);
        return response;
    }
}

let writes = Promise.resolve();
Http.middlewares = [
    async (next, context) => {
        const stamp = sessionGeneration();
        const scope = await getSessionCacheScope().catch(() => null);
        const response = await next();
        if (response.code === 401 && stamp === sessionGeneration()) {
            await clearSessionCookie();
            return response;
        }
        if (
            !scope ||
            stamp !== sessionGeneration() ||
            !isOfflineMetadataPath(context.path) ||
            (context.options.method && context.options.method !== "GET")
        )
            return response;
        try {
            const directory = new Directory(
                Paths.document,
                "metadata-v2",
                scope
            );
            const key = await digestStringAsync(
                CryptoDigestAlgorithm.SHA256,
                context.path
            );
            if (stamp !== sessionGeneration()) return response;
            const file = new File(directory, `${key}.json`);
            const sessionKey = await digestStringAsync(
                CryptoDigestAlgorithm.SHA256,
                "/user/session"
            );
            if (response.isOk()) {
                // A single self-contained response avoids hundreds of synchronous
                // per-media writes and cross-account references during normalization.
                const value = { savedAt: Date.now(), data: response.result };
                writes = writes
                    .then(() => {
                        if (stamp !== sessionGeneration()) return;
                        directory.create({
                            idempotent: true,
                            intermediates: true,
                        });
                        file.write(JSON.stringify(value));
                        const entries = directory
                            .list()
                            .filter(
                                (item): item is File =>
                                    item instanceof File &&
                                    item.name !== `${sessionKey}.json`
                            )
                            .sort(
                                (left, right) =>
                                    (left.modificationTime ?? 0) -
                                    (right.modificationTime ?? 0)
                            );
                        for (const expired of entries.slice(
                            0,
                            Math.max(
                                0,
                                entries.length -
                                    OFFLINE_METADATA_POLICY.maxPages
                            )
                        ))
                            expired.delete();
                    })
                    .catch(() => {});
                if (context.path === "/user/session") await writes;
            } else if (response.code === 0 && file.exists) {
                const value: unknown = JSON.parse(await file.text());
                if (
                    !value ||
                    typeof value !== "object" ||
                    !("savedAt" in value) ||
                    !("data" in value) ||
                    typeof value.savedAt !== "number" ||
                    (context.path !== "/user/session" &&
                        Date.now() - value.savedAt >
                            OFFLINE_METADATA_POLICY.maxAgeMs) ||
                    stamp !== sessionGeneration()
                )
                    return response;
                return new HttpResult({
                    ok: true,
                    code: 200,
                    message: "Offline cache",
                    result: context.schema.parse(value.data),
                });
            }
        } catch {
            /* Missing, corrupt or unavailable storage never masks an API result. */
        }
        return response;
    },
];
