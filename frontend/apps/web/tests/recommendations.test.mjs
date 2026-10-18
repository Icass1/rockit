/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export { RecommendationManager } from './lib/managers/recommendationManager';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "recommendationsModule",
    define: {
        "process.env.NEXT_PUBLIC_SITE_URL": '"https://test"',
        "process.env.NODE_ENV": '"production"',
        "process.env.NEXT_PUBLIC_BACKEND_URL": '"https://test"',
        "process.env.EXPO_PUBLIC_BACKEND_URL": '""',
    },
    external: ["next/headers"],
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "offline-ids",
            setup(builder) {
                builder.onResolve({ filter: /^@\/lib\/offline\/db$/ }, () => ({
                    path: "offline",
                    namespace: "mock",
                }));
                builder.onLoad(
                    { filter: /^offline$/, namespace: "mock" },
                    () => ({
                        contents:
                            "export const listOfflineSongIds = async () => ['local'];",
                    })
                );
                builder.onResolve({ filter: /^@rockit\/shared$/ }, () => ({
                    path: "shared",
                    namespace: "mock",
                }));
                builder.onLoad(
                    { filter: /^shared$/, namespace: "mock" },
                    () => ({
                        contents: `export {BaseHttp} from '${new URL("../../../packages/shared/src/http/baseHttp.ts", import.meta.url).pathname}';
                       export {HttpResult} from '${new URL("../../../packages/shared/src/models/types/httpTypes.ts", import.meta.url).pathname}';
                       export {BACKEND_URL} from '${new URL("../../../packages/shared/src/environment.ts", import.meta.url).pathname}';`,
                        resolveDir: new URL("../", import.meta.url).pathname,
                    })
                );
            },
        },
    ],
});

const artist = {
    type: "artist",
    provider: "RockIt",
    publicId: "artist",
    url: "/artist/artist",
    providerUrl: "",
    name: "Artist",
    imageUrl: "",
    dominantColor: "",
};
const song = {
    type: "song",
    provider: "RockIt",
    publicId: "local",
    providerUrl: "",
    name: "Track",
    artists: [artist],
    audioUrl: "https://test/rockit/audio/local",
    downloaded: true,
    imageUrl: "",
    dominantColor: "",
    duration_ms: 1000,
    discNumber: 1,
    trackNumber: 1,
    album: {
        type: "album",
        provider: "RockIt",
        publicId: "album",
        url: "/album/album",
        providerUrl: "",
        name: "Album",
        artists: [artist],
        releaseDate: "",
        imageUrl: "",
        dominantColor: "",
    },
};
const local = { songs: [song], provider: "local", externalStatus: "off" };

function setup(fetcher) {
    const storage = new Map();
    const calls = [];
    const context = vm.createContext({
        window: {},
        AbortController,
        setTimeout,
        clearTimeout,
        Response,
        console,
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        },
        fetch: async (url, options) => {
            calls.push({ url, options });
            return fetcher(url, options);
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    return {
        manager: context.recommendationsModule.RecommendationManager,
        storage,
        calls,
    };
}

test("local recommendations preserve playable models, session credentials and current-track exclusion", async () => {
    const { manager, calls } = setup(() => Response.json(local));
    const result = await manager.loadAsync(
        "alice",
        "",
        "playing",
        new AbortController().signal,
        () => {}
    );
    assert.equal(result.data.songs[0].audioUrl, song.audioUrl);
    assert.equal(result.data.songs[0].artists[0].publicId, "artist");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.credentials, "include");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
        externalUsername: "",
        currentPublicId: "playing",
    });
});

test("local results arrive before a slow external request and survive an HTTP failure", async () => {
    let finishExternal;
    let immediate;
    let entered;
    const externalStarted = new Promise((resolve) => {
        entered = resolve;
    });
    const { manager } = setup((_url, options) => {
        if (!JSON.parse(options.body).externalUsername)
            return Response.json(local);
        entered();
        return new Promise((resolve) => {
            finishExternal = resolve;
        });
    });
    const pending = manager.loadAsync(
        "alice",
        "lb-user",
        undefined,
        new AbortController().signal,
        (data) => {
            immediate = data;
        }
    );
    await externalStarted;
    assert.equal(immediate.songs[0].publicId, "local");
    finishExternal(new Response("unavailable", { status: 503 }));
    const result = await pending;
    assert.equal(result.data.provider, "local");
    assert.equal(result.data.songs.length, 1);
});

test("invalid external response falls back and opt-in is isolated per account", async () => {
    const { manager, calls } = setup((_url, options) =>
        JSON.parse(options.body).externalUsername
            ? Response.json({ songs: "wrong" })
            : Response.json(local)
    );
    manager.setUsername("alice", "lb-alice");
    assert.equal(manager.username("alice"), "lb-alice");
    assert.equal(manager.username("bob"), "");
    const result = await manager.loadAsync(
        "alice",
        manager.username("alice"),
        undefined,
        new AbortController().signal,
        () => {}
    );
    assert.equal(result.data.provider, "local");
    assert.equal(calls.length, 2);
    manager.setUsername("alice", "");
    assert.equal(manager.username("alice"), "");
});

test("browser network failure shows only cached tracks with offline audio", async () => {
    let offline = false;
    const { manager } = setup(() => {
        if (offline) throw new Error("offline");
        return Response.json({
            ...local,
            songs: [song, { ...song, publicId: "server-only" }],
        });
    });
    await manager.loadAsync(
        "alice",
        "",
        undefined,
        new AbortController().signal,
        () => {}
    );
    offline = true;
    const result = await manager.loadAsync(
        "alice",
        "",
        undefined,
        new AbortController().signal,
        () => {}
    );
    assert.equal(result.offline, true);
    assert.equal(result.data.songs.length, 1);
    assert.equal(result.data.songs[0].publicId, "local");
    await assert.rejects(
        manager.loadAsync(
            "bob",
            "",
            undefined,
            new AbortController().signal,
            () => {}
        )
    );
});

test("aborted loads never publish stale local results", async () => {
    const { manager } = setup(() => Response.json(local));
    const controller = new AbortController();
    controller.abort();
    let emitted = false;
    await assert.rejects(
        manager.loadAsync("alice", "", undefined, controller.signal, () => {
            emitted = true;
        })
    );
    assert.equal(emitted, false);
});
