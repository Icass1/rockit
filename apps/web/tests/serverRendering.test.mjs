/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { build } from "esbuild";
import { atom } from "nanostores";
import { renderToString } from "react-dom/server";

async function load(source, globals = {}) {
    const { outputFiles } = await build({
        stdin: {
            contents: source,
            resolveDir: new URL("../", import.meta.url).pathname,
        },
        bundle: true,
        write: false,
        format: "cjs",
        platform: "node",
        external: ["react", "react/jsx-runtime"],
        tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
        plugins: [
            {
                name: "server-fixtures",
                setup(builder) {
                    builder.onResolve(
                        {
                            filter: /^@\/components\/(LikeButton\/LikeButton|MediaContextMenu\/MediaContextMenu|ListeningHeatmap\/ListeningHeatmap|Footer\/BookmarkPopup|Footer\/PictureInPicture\/PictureInPicture)$/,
                        },
                        ({ path }) => ({ path, namespace: "peripheral" })
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "peripheral" },
                        () => ({
                            contents:
                                "export default function Peripheral({children}) { return children ?? null; }",
                        })
                    );
                    builder.onResolve(
                        {
                            filter: /^(server-only|next\/headers|next\/navigation|next\/image|next\/link|@\/lib\/rockit\/rockIt)$/,
                        },
                        ({ path }) => ({ path, namespace: "fixture" })
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "fixture" },
                        ({ path }) => ({
                            contents: {
                                "server-only": "",
                                "next/image":
                                    "import {createElement} from 'react'; export default function Image({src, alt, width, height, className}) { return createElement('img', {src, alt, width, height, className}); }",
                                "next/link":
                                    "import {createElement} from 'react'; export default function Link({children, href, className}) { return createElement('a', {href, className}, children); }",
                                "next/headers":
                                    "export const cookies = () => globals.cookies(); export const headers = () => globals.headers();",
                                "next/navigation":
                                    "export const useRouter = () => ({ refresh() {} }); export const redirect = (url) => { throw new Error('redirect:' + url); }; export const notFound = () => { throw new Error('not-found'); };",
                                "@/lib/rockit/rockIt":
                                    "export const rockIt = globals.rockIt;",
                            }[path],
                        })
                    );
                },
            },
        ],
    });
    const module = { exports: {} };
    new Function(
        "require",
        "module",
        "exports",
        "globals",
        outputFiles[0].text
    )(createRequire(import.meta.url), module, module.exports, globals);
    return module.exports;
}
const runtime = {
    queueManager: { readyAtom: atom(false), currentMediaAtom: atom(undefined) },
    mediaPlayerManager: {
        playingAtom: atom(false),
        durationAtom: atom(0),
        currentTimeAtom: atom(0),
        loadingAtom: atom(false),
        volumeAtom: atom(1),
        triggeredBookmarkPublicIdsAtom: atom([]),
    },
    userManager: {
        showListeningHeatmapAtom: atom(true),
        queueTypeAtom: atom("SORTED"),
        repeatModeAtom: atom("OFF"),
    },
    bookmarkManager: {
        currentMediaBookmarksAtom: atom([]),
        showPopupAtom: atom(false),
    },
    playerUIManager: { visibleAtom: atom(false) },
};
const vocabulary = await load(
    `export {VocabularyProvider, useVocabulary, useLanguage} from './components/providers/VocabularyProvider';
export {default as Footer} from './components/Footer/Footer';
export {preferredLanguage, completeVocabulary} from './lib/i18n/vocabulary';
export {QueueProvider} from './components/providers/QueueProvider';
export {QueueManager} from './lib/managers/queueManager';
export {setRockIt} from '../../packages/shared/src/rockit/rockitRef';`,
    { rockIt: runtime }
);
function Heading() {
    const text = vocabulary.useVocabulary();
    return createElement(
        "h1",
        { lang: vocabulary.useLanguage() },
        `${text.LIBRARY} / ${text.LOG_IN}`
    );
}
function render(lang, text, component = Heading, initial = {}) {
    return renderToString(
        createElement(
            vocabulary.VocabularyProvider,
            { initial: { currentLang: lang, vocabulary: text } },
            createElement(
                vocabulary.QueueProvider,
                { initial },
                createElement(component)
            )
        )
    );
}
test("translated first-render HTML needs no effect or global store mutation", () => {
    assert.match(
        render("es", { LIBRARY: "Biblioteca", LOG_IN: "Entrar" }),
        /Biblioteca \/ Entrar/
    );
    assert.match(
        render("fr", { LIBRARY: "Bibliothèque", LOG_IN: "Connexion" }),
        /Bibliothèque \/ Connexion/
    );
    assert.match(
        render("es", { LIBRARY: "Biblioteca", LOG_IN: "Entrar" }),
        /lang="es"/
    );
});
test("missing and empty translations use workbook English instead of keys", () => {
    const html = render("es", { LIBRARY: "Biblioteca", LOG_IN: "" });
    assert.doesNotMatch(html, /LOG_IN|LIBRARY/);
    assert.match(html, /Biblioteca/);
    assert.equal(
        vocabulary.completeVocabulary({ currentLang: "en", vocabulary: {} })
            .vocabulary.LOG_IN.length > 0,
        true
    );
});
test("footer text is in the first server render without live playback state", () => {
    for (const [lang, text] of [
        ["es", "No se está reproduciendo nada"],
        ["fr", "Aucun média en cours de lecture"],
    ]) {
        const html = render(
            lang,
            { NO_MEDIA_PLAYING: text },
            vocabulary.Footer
        );
        assert.match(html, /<footer id="app-footer"/);
        assert.ok(html.includes(text));
        assert.doesNotMatch(html, /NO_MEDIA_PLAYING/);
    }
});
test("footer falls back to workbook text for missing, blank and key-placeholder translations", () => {
    for (const text of [
        undefined,
        "",
        "   ",
        "NO_MEDIA_PLAYING",
        " NO_MEDIA_PLAYING ",
    ]) {
        const html = render(
            "es",
            text === undefined ? {} : { NO_MEDIA_PLAYING: text },
            vocabulary.Footer
        );
        assert.match(html, /No media playing/);
        assert.doesNotMatch(html, /NO_MEDIA_PLAYING/);
    }
});
const serverSong = {
    type: "song",
    publicId: "server-song",
    name: "Server current song",
    imageUrl: "/logo-192.png",
    duration_ms: 120000,
    artists: [
        { publicId: "artist", name: "Server artist", url: "/artist/artist" },
    ],
    album: { name: "Server album", url: "/album/album" },
};
function queueFor(media) {
    return {
        currentQueueMediaId: 42,
        queueType: "RANDOM",
        offset: 150,
        total: 200,
        queue: [
            {
                queueMediaId: 41,
                listPublicId: "album",
                media: { ...serverSong, name: "Earlier track" },
                sortedIndex: 1,
                randomIndex: 150,
            },
            {
                queueMediaId: 42,
                listPublicId: "album",
                media,
                sortedIndex: 0,
                randomIndex: 151,
            },
        ],
    };
}
test("current song, artwork, artist, album and controls render on the server without seeding runtime state", () => {
    const html = render("en", {}, vocabulary.Footer, {
        queue: queueFor(serverSong),
        session: { currentTimeMs: 30000, volume: 0.25, repeatMode: "ONE" },
    });
    for (const text of [
        "Server current song",
        "Server artist",
        "Server album",
        "0:30",
        "2:00",
    ])
        assert.ok(html.includes(text), text);
    assert.match(html, /src="\/logo-192.png"/);
    assert.match(html, /type="range"/);
    assert.doesNotMatch(
        html,
        /No media playing|NO_MEDIA_PLAYING|Earlier track/
    );
    assert.equal(runtime.queueManager.currentMediaAtom.get(), undefined);
    assert.equal(runtime.queueManager.readyAtom.get(), false);
});
test("radio station renders immediately and request snapshots remain isolated from live browser state", () => {
    runtime.queueManager.currentMediaAtom.set(serverSong);
    runtime.queueManager.readyAtom.set(true);
    try {
        const html = render("en", {}, vocabulary.Footer, {
            queue: queueFor({
                type: "station",
                name: "Server station",
                country: "Spain",
                imageUrl: "/radio-placeholder.png",
            }),
        });
        assert.match(html, /Server station/);
        assert.match(html, /Spain/);
        assert.doesNotMatch(html, /Server current song|No media playing/);
        const empty = render("en", {}, vocabulary.Footer, {
            queue: {
                queue: [],
                currentQueueMediaId: null,
                queueType: "SORTED",
                offset: 0,
                total: 0,
            },
        });
        assert.match(empty, /No media playing/);
        assert.doesNotMatch(empty, /Server current song|Server station/);
    } finally {
        runtime.queueManager.currentMediaAtom.set(undefined);
        runtime.queueManager.readyAtom.set(false);
    }
});
test("queue startup reuses the server page, preserves pagination and accepts subsequent refreshes", async () => {
    const previous = runtime.queueManager;
    const manager = new vocabulary.QueueManager();
    const requests = [];
    let playbackRequests = 0;
    runtime.queueManager = manager;
    runtime.webSocketManager = {
        onMessage() {},
        requestPlaybackState() {
            playbackRequests++;
        },
    };
    runtime.mediaPlayerManager.setMedia = async () => {};
    runtime.http = {
        getQueue: async (offset, limit) => {
            requests.push({ offset, limit });
            return {
                isOk: () => true,
                isNotOk: () => false,
                result:
                    offset === undefined
                        ? {
                              queue: [],
                              currentQueueMediaId: null,
                              queueType: "SORTED",
                              offset: 0,
                              total: 0,
                          }
                        : { ...queueFor(serverSong), offset, queue: [] },
            };
        },
    };
    vocabulary.setRockIt(runtime);
    try {
        manager.seedQueue(queueFor(serverSong));
        assert.equal(manager.currentMedia.name, "Server current song");
        assert.equal(manager.currentList, "album");
        assert.equal(manager.queueTotalCount, 200);
        assert.equal(manager.readyAtom.get(), true);
        await manager.init();
        await manager.init();
        assert.equal(
            requests.length,
            0,
            "Startup must not repeat the server queue request"
        );
        assert.equal(playbackRequests, 1);
        manager.seedQueue(
            queueFor({ ...serverSong, name: "Stale server snapshot" })
        );
        assert.equal(manager.currentMedia.name, "Server current song");
        await manager.loadPreviousQueuePageAsync();
        assert.deepEqual(requests, [{ offset: 100, limit: 50 }]);
        await manager.refreshAsync();
        assert.equal(manager.currentMedia, undefined);
        assert.equal(manager.queue.length, 0);
        assert.equal(manager.readyAtom.get(), true);
    } finally {
        runtime.queueManager = previous;
    }
});
test("locale negotiation respects quality, regional subtags and supported languages", () => {
    assert.equal(
        vocabulary.preferredLanguage("de-DE, fr-FR;q=0.9, en;q=0.2"),
        "fr"
    );
    assert.equal(vocabulary.preferredLanguage("es;q=0,en;q=1"), "en");
    assert.equal(vocabulary.preferredLanguage("es-ES;q=0.8,fr;q=0.9"), "fr");
    assert.equal(vocabulary.preferredLanguage("unknown"), "en");
});
test("server calls forward request-local cookies without sharing accounts", async () => {
    const storage = new AsyncLocalStorage();
    const calls = [];
    const { ServerHttp } = await load(
        "export {ServerHttp} from './lib/api/server';",
        {
            cookies: async () => ({
                get: () => ({ value: storage.getStore() }),
            }),
        }
    );
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        calls.push({
            url,
            cookie: options.headers.get("cookie"),
            cache: options.cache,
        });
        return Response.json({
            username: "listener",
            image: "",
            admin: false,
            queueType: "SORTED",
            repeatMode: "OFF",
            currentTimeMs: null,
        });
    };
    try {
        await Promise.all([
            storage.run("account-a", () => ServerHttp.getSession()),
            storage.run("account-b", () => ServerHttp.getSession()),
        ]);
        assert.deepEqual(calls.map((call) => call.cookie).sort(), [
            "session_id=account-a",
            "session_id=account-b",
        ]);
        assert.equal(
            calls.every((call) => call.cache === "no-store"),
            true
        );
    } finally {
        globalThis.fetch = original;
    }
});
test("route response classification distinguishes missing content from upstream failure", async () => {
    const { requireResult } = await load(
        "export {requireResult} from './lib/server/resources';"
    );
    const { HttpResult } = await load(
        "export {HttpResult} from '../../packages/shared/src/models/types/httpTypes';"
    );
    const fail = (code) =>
        new HttpResult({
            ok: false,
            code,
            message: "Failure",
            detail: "Failure",
        });
    assert.throws(() => requireResult(fail(401)), /redirect:\/login/);
    assert.throws(() => requireResult(fail(404)), /not-found/);
    assert.throws(() => requireResult(fail(503)), /AppError: 503/);
    assert.throws(() => requireResult(fail(403)), /AppError: 403/);
    assert.throws(() => requireResult(fail(200)), /AppError: 503/);
});
