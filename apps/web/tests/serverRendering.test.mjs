/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { build } from "esbuild";
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
                            filter: /^@\/components\/Footer\/(FooterLeft|FooterCenter|VolumeSlider|TogglePlayerUI|PictureInPicture\/PictureInPicture)$/,
                        },
                        ({ path }) => ({ path, namespace: "live-footer" })
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "live-footer" },
                        () => ({
                            contents:
                                "export default function LiveFooter() { throw new Error('Live playback must wait for hydration'); }",
                        })
                    );
                    builder.onResolve(
                        {
                            filter: /^(server-only|next\/headers|next\/navigation|@\/lib\/rockit\/rockIt)$/,
                        },
                        ({ path }) => ({ path, namespace: "fixture" })
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "fixture" },
                        ({ path }) => ({
                            contents: {
                                "server-only": "",
                                "next/headers":
                                    "export const cookies = () => globals.cookies(); export const headers = () => globals.headers();",
                                "next/navigation":
                                    "export const useRouter = () => ({ refresh() {} }); export const redirect = (url) => { throw new Error('redirect:' + url); }; export const notFound = () => { throw new Error('not-found'); };",
                                "@/lib/rockit/rockIt":
                                    "export const rockIt = {};",
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
const vocabulary =
    await load(`export {VocabularyProvider, useVocabulary, useLanguage} from './components/providers/VocabularyProvider';
export {default as Footer} from './components/Footer/Footer';
export {preferredLanguage, completeVocabulary} from './lib/i18n/vocabulary';`);
function Heading() {
    const text = vocabulary.useVocabulary();
    return createElement(
        "h1",
        { lang: vocabulary.useLanguage() },
        `${text.LIBRARY} / ${text.LOG_IN}`
    );
}
function render(lang, text, component = Heading) {
    return renderToString(
        createElement(
            vocabulary.VocabularyProvider,
            { initial: { currentLang: lang, vocabulary: text } },
            createElement(component)
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
