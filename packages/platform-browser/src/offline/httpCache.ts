import {
    clearSessionOffline,
    loadSessionOffline,
    saveSessionOffline,
} from "@rockit/platform-browser/offline/db";
import { BaseHttp, HttpResult, SessionResponseSchema } from "@rockit/shared";

const CACHE_PREFIX = "rockit-mobile-api:";
export const BROWSER_METADATA_POLICY = {
    maxPages: 100,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/** One middleware instance belongs to one application HTTP adapter. */
export function createOfflineMetadataCache() {
    let generation = 0;
    let writes = Promise.resolve();

    function enqueue(
        stamp: number,
        operation: () => Promise<void>
    ): Promise<void> {
        writes = writes
            .then(async () => {
                if (stamp === generation) await operation();
            })
            .catch(() => {});
        return writes;
    }

    async function invalidate(): Promise<void> {
        generation++;
        await writes;
        await clearSessionOffline().catch(() => {});
        if (typeof caches !== "undefined") {
            try {
                await Promise.all(
                    (await caches.keys())
                        .filter((key) => key.startsWith(CACHE_PREFIX))
                        .map((key) => caches.delete(key))
                );
            } catch {
                /* Storage is optional when signing in or out online. */
            }
        }
    }

    const middleware: (typeof BaseHttp.middlewares)[number] = async (
        next,
        context
    ) => {
        const stamp = generation;
        const result = await next();
        if (stamp !== generation) return result;
        const path = context.path.split("?")[0];
        if (
            result.code === 401 ||
            (result.isOk() && ["/auth/login", "/auth/logout"].includes(path))
        ) {
            await invalidate();
            return result;
        }
        if (context.options.method && context.options.method !== "GET")
            return result;
        if (path === "/user/session") {
            if (result.isOk()) {
                const session = SessionResponseSchema.safeParse(result.result);
                if (session.success)
                    await enqueue(stamp, () =>
                        saveSessionOffline(session.data)
                    );
            } else if (result.code === 0) {
                const cached = await loadSessionOffline().catch(() => null);
                if (cached && stamp === generation) {
                    try {
                        return new HttpResult({
                            ok: true,
                            code: 200,
                            message: "Offline cache",
                            result: context.schema.parse(cached),
                        });
                    } catch {
                        await invalidate();
                    }
                }
            }
            return result;
        }
        try {
            if (
                typeof caches === "undefined" ||
                !/^\/(?:user\/(?:library|queue|settings)|media\/(?:album|playlist|collection)|lyrics|stats\/home|vocabulary)(?:\/|$)/.test(
                    path
                )
            )
                return result;
            const session = await loadSessionOffline().catch(() => null);
            if (!session || stamp !== generation) return result;
            const cache = await caches.open(
                CACHE_PREFIX + encodeURIComponent(session.username)
            );
            const key = new URL(context.path, "https://rockit-cache.invalid")
                .href;
            if (result.isOk()) {
                void enqueue(stamp, async () => {
                    await cache.put(
                        key,
                        new Response(JSON.stringify(result.result), {
                            headers: {
                                "content-type": "application/json",
                                "x-rockit-saved-at": String(Date.now()),
                            },
                        })
                    );
                    const keys = await cache.keys();
                    await Promise.all(
                        keys
                            .slice(
                                0,
                                Math.max(
                                    0,
                                    keys.length -
                                        BROWSER_METADATA_POLICY.maxPages
                                )
                            )
                            .map((request) => cache.delete(request))
                    );
                });
            } else if (result.code === 0) {
                const cached = await cache.match(key);
                if (
                    cached &&
                    Date.now() -
                        Number(cached.headers.get("x-rockit-saved-at")) <=
                        BROWSER_METADATA_POLICY.maxAgeMs &&
                    stamp === generation
                ) {
                    try {
                        return new HttpResult({
                            ok: true,
                            code: 200,
                            message: "Offline cache",
                            result: context.schema.parse(await cached.json()),
                        });
                    } catch {
                        await cache.delete(key);
                    }
                }
            }
        } catch {
            /* Optional offline storage must not block online responses. */
        }
        return result;
    };

    return { middleware, invalidate };
}
