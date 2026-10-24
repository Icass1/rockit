/* eslint @typescript-eslint/explicit-function-return-type: "off" -- Node runs this JavaScript test directly. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const workerUrl = new URL("../app/sw.ts", import.meta.url);
const { outputFiles } = await build({
    stdin: {
        contents: `${await readFile(workerUrl, "utf8")}\nexport { runtimeCaching };`,
        resolveDir: new URL("../app/", import.meta.url).pathname,
        loader: "ts",
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "worker",
    define: { "process.env.NODE_ENV": '"production"' },
});

class WorkerEvent {
    pending = [];
    waitUntil(promise) {
        this.pending.push(promise);
    }
}

class WorkerFetchEvent extends WorkerEvent {
    constructor(request) {
        super();
        this.request = request;
    }
    respondWith(promise) {
        this.response = promise;
    }
}

function createWorker(fetch) {
    const listeners = new Map();
    const cacheAccesses = [];
    const location = new URL("https://app.rockit.test");
    const caches = {
        async match(...args) {
            cacheAccesses.push(args);
            return undefined;
        },
        async open(...args) {
            cacheAccesses.push(args);
            throw new Error("Streaming must not open Cache Storage");
        },
    };
    const self = {
        location,
        caches,
        registration: { scope: location.href },
        skipWaiting() {},
        addEventListener(name, listener) {
            const entries = listeners.get(name) ?? [];
            entries.push(listener);
            listeners.set(name, entries);
        },
    };
    const context = vm.createContext({
        self,
        location,
        caches,
        fetch,
        URL,
        Request,
        Response,
        Headers,
        ReadableStream,
        FetchEvent: WorkerFetchEvent,
        ExtendableEvent: WorkerEvent,
        setTimeout,
        clearTimeout,
        console,
    });
    vm.runInContext(outputFiles[0].text, context);
    return { listeners, cacheAccesses, routes: context.worker.runtimeCaching };
}

for (const origin of ["https://app.rockit.test", "https://api.rockit.test"]) {
    for (const path of [
        "/rockit/audio/song-id",
        "/rockit/video/video-id/stream",
        "/rockit/video/video-id/stream/audio",
        "/youtube/video/video-id/stream",
        "/youtube/video/video-id/stream/audio",
    ]) {
        for (const range of [undefined, "bytes=65536-131071", "bytes=-1024"]) {
            test(`streams ${origin}${path} (${range ?? "no range"}) without buffering or caching`, async () => {
                const request = new Request(`${origin}${path}`, {
                    credentials: "include",
                    headers: range ? { Range: range } : {},
                });
                let controller;
                // Deliberately leave the body open: waiting for the entire file
                // would prevent the fetch event from returning its response.
                const body = new ReadableStream({
                    start(value) {
                        controller = value;
                        controller.enqueue(new Uint8Array([1, 2, 3]));
                    },
                });
                const headers = range
                    ? { "Content-Range": "bytes 65536-131071/999999999" }
                    : {};
                const networkResponse = new Response(body, {
                    status: range ? 206 : 200,
                    headers,
                });
                const requests = [];
                const { listeners, cacheAccesses } = createWorker(
                    async (incoming) => {
                        requests.push(incoming);
                        return networkResponse;
                    }
                );
                const event = new WorkerFetchEvent(request);
                for (const listener of listeners.get("fetch")) listener(event);
                let timeout;
                try {
                    const response = await Promise.race([
                        event.response,
                        new Promise((_, reject) => {
                            timeout = setTimeout(
                                () =>
                                    reject(
                                        new Error(
                                            "Response waited for the full body"
                                        )
                                    ),
                                1000
                            );
                        }),
                    ]);
                    assert.equal(response, networkResponse);
                    assert.equal(response.bodyUsed, false);
                    assert.equal(response.status, range ? 206 : 200);
                    assert.equal(
                        response.headers.get("Content-Range"),
                        headers["Content-Range"] ?? null
                    );
                    assert.equal(requests.length, 1);
                    assert.equal(
                        requests[0].headers.get("Range"),
                        range ?? null
                    );
                    assert.equal(requests[0].credentials, "include");
                    assert.deepEqual(cacheAccesses, []);
                    const reader = response.body.getReader();
                    assert.deepEqual(
                        (await reader.read()).value,
                        new Uint8Array([1, 2, 3])
                    );
                    await reader.cancel();
                    await Promise.all(event.pending);
                } finally {
                    clearTimeout(timeout);
                }
            });
        }
    }
}

test("media destinations and arbitrary Range requests precede default caches; metadata still uses its cache", () => {
    const { routes } = createWorker(() => {
        throw new Error("Unexpected fetch");
    });
    for (const [path, destination, range] of [
        ["/external/movie.mp4", "video", false],
        ["/external/song.mp3", "audio", false],
        ["/other/resource", "", true],
        ["/rockit/video/id/stream", "", false],
        ["/youtube/video/id/stream", "", false],
        ["/youtube/video/id/stream/audio", "", false],
    ]) {
        const url = new URL(path, "https://app.rockit.test");
        const request = new Request(url, {
            headers: range ? { Range: "bytes=0-1" } : {},
        });
        Object.defineProperty(request, "destination", { value: destination });
        const route = routes.find(
            ({ matcher }) =>
                typeof matcher === "function" &&
                matcher({ url, request, sameOrigin: true })
        );
        assert.equal(route.handler.constructor.name, "NetworkOnly");
    }
    for (const path of [
        "/media/video/id",
        "/rockit/song/id",
        "/youtube/video/id",
    ]) {
        const url = new URL(path, "https://api.rockit.test");
        const request = new Request(url);
        const route = routes.find(
            ({ matcher }) =>
                typeof matcher === "function" &&
                matcher({ url, request, sameOrigin: false })
        );
        assert.equal(route.handler.cacheName, "rockit-details");
    }
});

test("Home and Library refreshes bypass stale worker caches; other statistics still prefer network", () => {
    const { routes } = createWorker(() => {
        throw new Error("Unexpected fetch");
    });
    for (const [path, strategy] of [
        ["/stats/home", "NetworkOnly"],
        ["/user/library/medias", "NetworkOnly"],
        ["/stats/user", "NetworkFirst"],
    ]) {
        const url = new URL(path, "https://api.rockit.test");
        const request = new Request(url);
        const route = routes.find(
            ({ matcher }) =>
                typeof matcher === "function" &&
                matcher({ url, request, sameOrigin: false })
        );
        assert.equal(route.handler.constructor.name, strategy);
    }
});
