/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {UserManager} from './lib/managers/userManager';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "fixture",
    platform: "node",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "service-isolation",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/(rockit\/rockIt|http|offline\/db)$/ },
                    ({ path }) => ({ path, namespace: "fixture" })
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixture" },
                    ({ path }) => ({
                        contents: path.endsWith("http")
                            ? "export const Http=globalThis.http;"
                            : path.endsWith("db")
                              ? 'export const loadSessionOffline=()=>{throw new Error("Unexpected default cache")};export const saveSessionOffline=loadSessionOffline;export const clearSessionOffline=loadSessionOffline;'
                              : "export const rockIt=globalThis.runtime;",
                    })
                );
            },
        },
    ],
});
const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
};
const session = (username = "first", overrides = {}) => ({
    username,
    queueType: "SORTED",
    repeatMode: "OFF",
    image: "image",
    admin: true,
    currentTimeMs: 1234,
    showListeningHeatmap: false,
    autoAddToLibrary: false,
    volume: 0.25,
    ...overrides,
});
const ok = (result = session()) => ({ isOk: () => true, result });
const fail = (code = 503) => ({ isOk: () => false, code });
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
function setup({ seed = true } = {}) {
    const requests = [],
        cacheEvents = [],
        handlers = new Set(),
        errors = [];
    const calls = { disconnect: 0, queue: 0, search: 0, downloads: 0 };
    const http = new Proxy(
        {},
        {
            get:
                (_, name) =>
                (...args) => {
                    const pending = deferred();
                    requests.push({ name, args, ...pending });
                    return pending.promise;
                },
        }
    );
    let cached;
    const cache = {
        async load() {
            cacheEvents.push("load");
            return cached;
        },
        async save(value) {
            cacheEvents.push(["save", value.username]);
            cached = value;
        },
        async clear() {
            cacheEvents.push("clear");
            cached = undefined;
        },
    };
    const notifications = [],
        vocabularies = [],
        events = [];
    const services = {
        http,
        notificationManager: {
            notifyError: (message) => notifications.push(["error", message]),
            notifySuccess: (message) =>
                notifications.push(["success", message]),
        },
        vocabularyManager: {
            vocabulary: {
                ERROR: "localized error",
                LANGUAGE_CHANGED: "changed",
                ERROR_CHANGING_LANGUAGE: "language error",
            },
            getVocabularyAsync: (code) => http.getVocabularyAsync(code),
            setVocabulary: (value) => vocabularies.push(value),
        },
        searchManager: {
            clearResults() {
                calls.search++;
            },
        },
        downloaderManager: {
            reset() {
                calls.downloads++;
            },
        },
        sessionCache: cache,
        webSocketManager: {
            onMessage(type, fn) {
                assert.equal(type, "queue_type");
                handlers.add(fn);
            },
            offMessage(type, fn) {
                assert.equal(type, "queue_type");
                handlers.delete(fn);
            },
            disconnect() {
                calls.disconnect++;
            },
        },
        queueManager: {
            updateQueue() {
                calls.queue++;
            },
        },
    };
    const context = vm.createContext({
        window: { dispatchEvent: (event) => events.push(event.type) },
        Event: class {
            constructor(type) {
                this.type = type;
            }
        },
        http,
        process: { env: {} },
        console: { error: (...args) => errors.push(args) },
        runtime: {
            searchManager: {
                clearResults() {
                    calls.search++;
                },
            },
            downloaderManager: {
                reset() {
                    calls.downloads++;
                },
            },
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    const manager = new context.fixture.UserManager(services);
    if (seed) manager.seedSession(session());
    return {
        manager,
        requests,
        cacheEvents,
        cache,
        calls,
        errors,
        handlers,
        services,
        notifications,
        vocabularies,
        events,
        getCached: () => cached,
        emit(type = "RANDOM") {
            for (const fn of handlers)
                fn({ type: "queue_type", queueType: type });
        },
    };
}

test("seeding and initialization reuse server session without reads or duplicate cache writes", async () => {
    const f = setup();
    await flush();
    assert.equal(f.handlers.size, 0);
    const started = f.manager.start();
    assert.equal(f.manager.start(), started);
    await started;
    await f.manager.init();
    await flush();
    assert.equal(f.requests.length, 0);
    assert.equal(f.handlers.size, 1);
    assert.equal(f.cacheEvents.length, 1);
    assert.equal(f.manager.sessionAtom.get().username, "first");
    assert.equal(f.manager.sessionReadyAtom.get(), true);
    f.emit();
    assert.equal(f.manager.queueType, "RANDOM");
    assert.equal(f.calls.queue, 1);
    f.manager.stop();
    f.manager.stop();
    assert.equal(f.handlers.size, 0);
    f.emit("SORTED");
    assert.equal(f.manager.queueType, "RANDOM");
    await f.manager.start();
    assert.equal(f.handlers.size, 1);
    assert.equal(f.requests.length, 0);
    f.emit("SORTED");
    assert.equal(f.manager.queueType, "SORTED");
    f.manager.stop();
});

test("a late startup read cannot replace a restarted shell's server session", async () => {
    const f = setup({ seed: false });
    const old = f.manager.start();
    assert.equal(f.requests.length, 1);
    f.manager.stop();
    f.manager.seedSession(session("replacement"));
    await f.manager.start();
    f.requests[0].resolve(ok(session("private-old")));
    await old;
    await flush();
    assert.equal(f.manager.sessionAtom.get().username, "replacement");
    assert.equal(f.getCached().username, "replacement");
    assert.equal(f.manager.sessionReadyAtom.get(), true);
    f.manager.stop();
});

test("unseeded restart fetches once and rejects the previous lifecycle's result and finalizer", async () => {
    const f = setup({ seed: false });
    const old = f.manager.start();
    f.manager.stop();
    const current = f.manager.start();
    assert.equal(f.requests.length, 2);
    f.requests[0].resolve(ok(session("old")));
    await old;
    assert.equal(f.manager.sessionAtom.get(), undefined);
    assert.equal(f.manager.sessionReadyAtom.get(), false);
    f.requests[1].resolve(ok(session("current")));
    await current;
    assert.equal(f.manager.sessionAtom.get().username, "current");
    assert.equal(f.manager.sessionReadyAtom.get(), true);
    f.manager.stop();
});

test("latest session refresh wins over older success, unauthorized and transport failure", async () => {
    for (const outcome of [
        ok(session("old")),
        fail(401),
        new Error("old offline"),
    ]) {
        const f = setup();
        await f.manager.start();
        const old = f.manager.updateAsync(),
            current = f.manager.updateAsync();
        f.requests[1].resolve(ok(session("current")));
        await current;
        if (outcome instanceof Error) f.requests[0].reject(outcome);
        else f.requests[0].resolve(outcome);
        await old;
        await flush();
        assert.equal(f.manager.sessionAtom.get().username, "current");
        assert.equal(f.getCached().username, "current");
        assert.equal(f.errors.length, 0);
        assert.equal(f.calls.disconnect, 0);
        f.manager.stop();
    }
});

test("offline fallback uses the current account and late cached reads cannot restore a replacement", async () => {
    const f = setup();
    await f.manager.start();
    let pending = f.manager.updateAsync();
    f.requests[0].resolve(fail());
    await pending;
    assert.equal(f.manager.sessionAtom.get().username, "first");
    const load = deferred();
    f.cache.load = () => load.promise;
    pending = f.manager.updateAsync();
    f.requests[1].resolve(fail());
    await flush();
    const current = f.manager.updateAsync();
    f.requests[2].resolve(ok(session("second")));
    await current;
    load.resolve(session("private-old"));
    await pending;
    await flush();
    assert.equal(f.manager.sessionAtom.get().username, "second");
    assert.equal(f.getCached().username, "second");
    f.manager.stop();
});

test("cache or transport failures are handled and another account's cached session is rejected", async () => {
    for (const throws of [false, true]) {
        const f = setup();
        await f.manager.start();
        f.cache.load = async () => session("other");
        const pending = f.manager.updateAsync();
        if (throws) f.requests[0].reject(new Error("offline"));
        else f.requests[0].resolve(fail());
        await pending;
        assert.equal(f.manager.sessionAtom.get(), null);
        assert.equal(f.manager.loggedInAtom.get(), false);
        assert.equal(f.manager.usernameAtom.get(), "");
        assert.equal(f.manager.admin.get(), false);
        assert.equal(f.manager.imageAtom.get(), "");
        assert.equal(f.manager.currentTimeMsAtom.get(), null);
        f.emit();
        assert.equal(f.calls.queue, 0);
        f.manager.stop();
    }
});

test("401 clears the session immediately and serialized cache clearing cannot erase a replacement", async () => {
    const f = setup();
    await f.manager.start();
    await flush();
    const clearing = deferred();
    f.cache.clear = async () => {
        await clearing.promise;
        f.cacheEvents.push("cleared-old");
    };
    const expired = f.manager.updateAsync();
    f.requests[0].resolve(fail(401));
    await flush();
    assert.equal(f.manager.sessionAtom.get(), null);
    assert.equal(f.manager.usernameAtom.get(), "");
    assert.equal(f.manager.admin.get(), false);
    const replacement = f.manager.updateAsync();
    f.requests[1].resolve(ok(session("replacement")));
    await replacement;
    clearing.resolve();
    await expired;
    await flush();
    assert.equal(f.getCached().username, "replacement");
    assert.equal(f.cacheEvents.at(-1)[0], "save");
    f.manager.stop();
});

test("logout invalidates pending reads before waiting for offline cleanup", async () => {
    const f = setup();
    await f.manager.start();
    const refresh = f.manager.updateAsync();
    const logout = f.manager.signOut();
    f.requests[1].resolve(ok());
    await logout;
    f.requests[0].resolve(ok(session("private-old")));
    await refresh;
    await flush();
    assert.equal(f.manager.sessionAtom.get(), null);
    assert.equal(f.getCached(), undefined);
    assert.equal(f.calls.search, 1);
    assert.equal(f.calls.downloads, 1);
    f.manager.stop();
});

test("stale logout cannot clear replacement session, cache, search or downloads", async () => {
    const f = setup();
    await f.manager.start();
    const logout = f.manager.signOut();
    const refresh = f.manager.updateAsync();
    f.requests[1].resolve(ok(session("replacement")));
    await refresh;
    f.requests[0].resolve(ok());
    await logout;
    await flush();
    assert.equal(f.manager.sessionAtom.get().username, "replacement");
    assert.equal(f.getCached().username, "replacement");
    assert.equal(f.calls.search, 0);
    assert.equal(f.calls.downloads, 0);
    f.manager.stop();
});

test("logout cleanup survives shell unmount and completes after an older pending cache save", async () => {
    const f = setup({ seed: false });
    const saving = deferred();
    f.cache.save = async () => {
        await saving.promise;
        f.cacheEvents.push("old-save-complete");
    };
    const start = f.manager.start();
    f.requests[0].resolve(ok());
    await start;
    await flush();
    const logout = f.manager.signOut();
    f.requests[1].resolve(ok());
    await flush();
    assert.equal(f.manager.sessionAtom.get(), null);
    f.manager.stop();
    saving.resolve();
    await logout;
    assert.equal(f.cacheEvents.at(-1), "clear");
    assert.equal(f.getCached(), undefined);
});

const file = { name: "photo.png", type: "image/png", size: 10 };
const mutations = [
    ["uploadProfileImageAsync", file],
    ["setDownloadAutoAddToLibraryAsync", true],
    ["setListeningHeatmapAsync", true],
    ["setLangAsync", "es"],
];
async function replaceSession(f, username) {
    const refresh = f.manager.updateAsync();
    f.requests.at(-1).resolve(ok(session(username)));
    await refresh;
}

test("all user mutations reject old completions and failures after account round trips, logout and cleanup", async () => {
    for (const [method, arg] of mutations)
        for (const transition of ["switch", "round-trip", "logout", "restart"])
            for (const rejects of [false, true]) {
                const f = setup();
                await f.manager.start();
                const pending = f.manager[method](arg);
                const old = f.requests[0];
                if (transition === "restart") {
                    f.manager.stop();
                    await f.manager.start();
                } else if (transition === "logout") {
                    const logout = f.manager.signOut();
                    f.requests.at(-1).resolve(ok());
                    await logout;
                } else {
                    await replaceSession(f, "replacement");
                    if (transition === "round-trip")
                        await replaceSession(f, "first");
                }
                const before = f.requests.length;
                if (rejects) old.reject(new Error("old failure"));
                else old.resolve(ok());
                assert.equal(await pending, false);
                assert.equal(f.requests.length, before);
                assert.deepEqual(f.notifications, []);
                assert.deepEqual(f.vocabularies, []);
                assert.deepEqual(f.events, []);
                assert.equal(f.errors.length, 0);
                const current = f.manager.sessionAtom.get();
                if (current) {
                    assert.equal(current.autoAddToLibrary, false);
                    assert.equal(current.showListeningHeatmap, false);
                    assert.equal(current.image, "image");
                }
                f.manager.stop();
            }
});

test("stopped managers cannot start preference mutations and invalid profile files do not reach HTTP", async () => {
    const f = setup();
    await f.manager.start();
    f.manager.stop();
    for (const [method, arg] of mutations)
        assert.equal(await f.manager[method](arg), false);
    await f.manager.start();
    for (const invalid of [
        { ...file, size: 0 },
        { ...file, size: 6 * 1024 * 1024 },
        { ...file, type: "text/plain" },
    ])
        assert.equal(await f.manager.uploadProfileImageAsync(invalid), false);
    assert.equal(f.requests.length, 0);
    f.manager.stop();
});

test("live preference updates patch current session and offline snapshot; older reads cannot undo them", async () => {
    const f = setup();
    await f.manager.start();
    const read = f.manager.updateAsync();
    const download = f.manager.setDownloadAutoAddToLibraryAsync(true);
    const heatmap = f.manager.setListeningHeatmapAsync(true);
    f.requests[1].resolve(ok());
    assert.equal(await download, true);
    f.requests[2].resolve(ok());
    assert.equal(await heatmap, true);
    f.requests[0].resolve(ok(session()));
    await read;
    await flush();
    assert.equal(f.manager.sessionAtom.get().autoAddToLibrary, true);
    assert.equal(f.manager.sessionAtom.get().showListeningHeatmap, true);
    assert.equal(f.manager.showListeningHeatmapAtom.get(), true);
    assert.equal(f.getCached().autoAddToLibrary, true);
    assert.equal(f.getCached().showListeningHeatmap, true);
    assert.deepEqual(f.notifications, []);
    f.manager.stop();
});

test("newer saves of each preference supersede older success and failure", async () => {
    for (const method of [
        "setDownloadAutoAddToLibraryAsync",
        "setListeningHeatmapAsync",
    ])
        for (const rejected of [true, false]) {
            const f = setup();
            await f.manager.start();
            const old = f.manager[method](true),
                current = f.manager[method](false);
            f.requests[1].resolve(ok());
            assert.equal(await current, true);
            if (rejected) f.requests[0].reject(new Error("old failure"));
            else f.requests[0].resolve(ok());
            assert.equal(await old, false);
            assert.deepEqual(f.notifications, []);
            assert.equal(f.manager.sessionAtom.get().autoAddToLibrary, false);
            assert.equal(
                f.manager.sessionAtom.get().showListeningHeatmap,
                false
            );
            f.manager.stop();
        }
});

test("profile refresh updates only the image and rejects stale or mismatched refreshed sessions", async () => {
    for (const outcome of ["live", "switch", "mismatch"]) {
        const f = setup();
        await f.manager.start();
        const profile = f.manager.uploadProfileImageAsync(file);
        f.requests[0].resolve(ok());
        await flush();
        assert.equal(f.requests[1].name, "getSession");
        const download = f.manager.setDownloadAutoAddToLibraryAsync(true);
        f.requests[2].resolve(ok());
        await download;
        if (outcome === "switch") await replaceSession(f, "replacement");
        f.requests[1].resolve(
            ok(
                session(outcome === "mismatch" ? "other" : "first", {
                    image: "new-image",
                })
            )
        );
        assert.equal(await profile, outcome === "live");
        if (outcome === "live") {
            assert.equal(f.manager.sessionAtom.get().image, "new-image");
            assert.equal(f.manager.sessionAtom.get().autoAddToLibrary, true);
            assert.equal(f.getCached().autoAddToLibrary, true);
        } else assert.equal(f.manager.sessionAtom.get().image, "image");
        f.manager.stop();
    }
});

test("language changes install and announce only the latest vocabulary in the current lifecycle", async () => {
    for (const transition of ["none", "switch", "restart", "newer"]) {
        const f = setup();
        await f.manager.start();
        const pending = f.manager.setLangAsync("es");
        f.requests[0].resolve(ok());
        await flush();
        assert.equal(f.requests[1].name, "getVocabularyAsync");
        assert.equal(f.requests[1].args[0], "es");
        if (transition === "switch") await replaceSession(f, "replacement");
        if (transition === "restart") {
            f.manager.stop();
            await f.manager.start();
        }
        if (transition === "newer") {
            const newer = f.manager.setLangAsync("fr");
            f.requests[2].resolve(ok());
            await flush();
            f.requests[3].resolve(ok({ currentLang: "fr" }));
            assert.equal(await newer, true);
        }
        f.requests[1].resolve(ok({ currentLang: "es" }));
        assert.equal(await pending, transition === "none");
        const accepted = ["none", "newer"].includes(transition);
        assert.equal(f.vocabularies.length, accepted ? 1 : 0);
        if (accepted)
            assert.equal(
                f.vocabularies[0].currentLang,
                transition === "newer" ? "fr" : "es"
            );
        assert.equal(f.notifications.length, accepted ? 1 : 0);
        assert.equal(f.events.length, accepted ? 1 : 0);
        f.manager.stop();
    }
});

test("live settings/language failures retain state and use localized feedback without partial language installation", async () => {
    for (const [method, arg] of mutations.slice(1))
        for (const rejects of [true, false]) {
            const f = setup();
            await f.manager.start();
            const pending = f.manager[method](arg);
            if (rejects) f.requests[0].reject(new Error("offline"));
            else f.requests[0].resolve(fail(500));
            assert.equal(await pending, false);
            assert.deepEqual(f.notifications, [
                [
                    "error",
                    method === "setLangAsync"
                        ? "language error"
                        : "localized error",
                ],
            ]);
            assert.deepEqual(f.events, []);
            assert.deepEqual(f.vocabularies, []);
            f.manager.stop();
        }
    const f = setup();
    await f.manager.start();
    const language = f.manager.setLangAsync("es");
    f.requests[0].resolve(ok());
    await flush();
    f.requests[1].resolve(fail(503));
    assert.equal(await language, false);
    assert.deepEqual(f.vocabularies, []);
    assert.deepEqual(f.events, []);
    f.manager.stop();
});

test("settings cache completion cannot report success in a replacement account", async () => {
    const f = setup();
    await f.manager.start();
    await flush();
    const save = deferred();
    f.cache.save = () => save.promise;
    const preference = f.manager.setListeningHeatmapAsync(true);
    f.requests[0].resolve(ok());
    await flush();
    const replacement = replaceSession(f, "replacement");
    await replacement;
    save.resolve();
    assert.equal(await preference, false);
    await flush();
    assert.equal(f.manager.sessionAtom.get().username, "replacement");
    assert.equal(f.manager.sessionAtom.get().showListeningHeatmap, false);
    f.manager.stop();
});
