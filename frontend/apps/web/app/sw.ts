/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
    CacheableResponsePlugin,
    CacheFirst,
    ExpirationPlugin,
    NetworkFirst,
    NetworkOnly,
    RangeRequestsPlugin,
    Serwist,
    StaleWhileRevalidate,
    type SerwistPlugin,
} from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}
declare const self: ServiceWorkerGlobalScope;

/*
 * Strips the `Vary` header before a response is stored in Cache Storage.
 *
 * The backend (Starlette CORSMiddleware with explicit origins) sends
 * `Vary: Origin` on every response. Cache Storage honors Vary when
 * matching, so a response cached from the app's CORS fetch would never
 * match the no-cors request an <audio> element makes (no Origin header).
 * Removing Vary makes matching purely URL-based — safe here because this
 * cache is private, per-device and per-origin.
 */
const stripVaryHeaderPlugin: SerwistPlugin = {
    cacheWillUpdate: async ({
        response,
    }): Promise<Response | null | undefined> => {
        if (!response.headers.has("vary")) return response;

        const headers = new Headers(response.headers);
        headers.delete("vary");
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    },
};

const runtimeCaching = [
    // Session — NetworkFirst with short timeout (falls back to SW cache if offline/slow)
    {
        matcher: ({ url }: { url: URL }) =>
            url.origin !== self.location.origin &&
            url.pathname === "/user/session",
        handler: new NetworkFirst({
            cacheName: "rockit-session",
            networkTimeoutSeconds: 3,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 1,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Vocabulary — StaleWhileRevalidate (serve cache immediately, update in background)
    {
        matcher: ({ url }: { url: URL }) =>
            url.origin !== self.location.origin &&
            url.pathname.startsWith("/vocabulary/"),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-vocabulary",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 1,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Audio streams — CacheFirst over full (200) responses.
    // A 206 partial response cannot be stored in Cache Storage, so
    // CacheableResponsePlugin rejects them and they pass through to the
    // network untouched. The app warms this cache by fetching the complete
    // file without a Range header when playback starts; subsequent <audio>
    // element requests hit the cache and RangeRequestsPlugin slices them.
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/rockit/audio/"),
        handler: new CacheFirst({
            cacheName: "rockit-audio",
            plugins: [
                new CacheableResponsePlugin({ statuses: [200] }),
                stripVaryHeaderPlugin,
                new RangeRequestsPlugin(),
                new ExpirationPlugin({
                    maxEntries: 200,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Detail lookups — StaleWhileRevalidate.
    // Content is keyed by publicId and effectively immutable, so serving a
    // cached copy instantly and revalidating in the background is safe:
    // metadata changes become visible on the visit after next.
    {
        matcher: ({ url }: { url: URL }) =>
            /^\/(media\/(song|album|artist|playlist|station|video)|rockit\/(song|album)|radio\/station|spotify\/(track|album|artist|playlist)|youtube\/(video|chanel)|lrclib\/lyrics)\//.test(
                url.pathname
            ),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-details",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 500,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Changing lists — NetworkFirst with a short timeout so a slow or flaky
    // network falls back to the cached snapshot instead of hanging forever.
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/stats/") ||
            url.pathname.startsWith("/featured/") ||
            url.pathname === "/user/library/medias" ||
            url.pathname === "/user/liked-media" ||
            url.pathname === "/bookmark/list",
        handler: new NetworkFirst({
            cacheName: "rockit-lists",
            networkTimeoutSeconds: 3,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Catch-all for other cross-origin requests — no caching
    {
        matcher: ({ url, request }: { url: URL; request: Request }) =>
            url.origin !== self.location.origin ||
            (url.pathname.startsWith("/api/") &&
                request.destination !== "document"),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url, request }: { url: URL; request: Request }) =>
            request.destination === "image" ||
            url.pathname.startsWith("/media/image/"),
        handler: new CacheFirst({
            cacheName: "rockit-images",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 300,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    {
        matcher: ({
            request,
            sameOrigin,
        }: {
            request: Request;
            sameOrigin: boolean;
        }) =>
            sameOrigin &&
            (request.headers.get("RSC") === "1" ||
                request.destination === "document"),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-pages",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    ...defaultCache,
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching,
    fallbacks: {
        entries: [
            {
                url: "/~offline",
                matcher({ request }: { request: Request }) {
                    return request.destination === "document";
                },
            },
        ],
    },
});

serwist.addEventListeners();
