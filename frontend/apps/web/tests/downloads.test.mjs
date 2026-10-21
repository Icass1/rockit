/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
const { outputFiles } = await build({
    stdin: {
        contents: `export {DownloaderManager} from './lib/managers/downloaderManager';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "dependencies",
            setup(b) {
                b.onResolve(
                    { filter: /^@\/lib\/(http|rockit\/rockIt)$/ },
                    (args) => ({ path: args.path, namespace: "mock" })
                );
                b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
                    contents: args.path.endsWith("http")
                        ? "export const Http = globalThis.http;"
                        : "export const rockIt = globalThis.rockIt;",
                }));
            },
        },
    ],
});
const ok = (result) => ({ isOk: () => true, result });
const failure = () => ({ isOk: () => false, message: "Server unavailable" });
const item = {
    publicId: "download",
    mediaPublicId: "media",
    status: "COMPLETED",
    progress: 100,
};
function setup() {
    const messages = [],
        listeners = new Map(),
        timers = [];
    const http = {
        getDownloads: async () =>
            ok({
                downloads: [
                    {
                        publicId: "group",
                        sourcePublicId: "playlist",
                        items: [item],
                    },
                ],
            }),
        deleteDownload: async () => ok({}),
        retryDownload: async () => ok({}),
        addMediaToLibrary: async () => ok({}),
    };
    const rockIt = {
        notificationManager: {
            notifySuccess: (m) => messages.push(m),
            notifyError: (m) => messages.push(m),
        },
        vocabularyManager: {
            vocabulary: new Proxy({}, { get: (_, key) => key }),
        },
        webSocketManager: { onMessage: (type, fn) => listeners.set(type, fn) },
        eventManager: { dispatchEvent() {} },
    };
    const context = vm.createContext({
        http,
        rockIt,
        console,
        process,
        setTimeout: (fn) => {
            timers.push(fn);
            return timers.length;
        },
        clearTimeout() {},
    });
    vm.runInContext(outputFiles[0].text, context);
    const manager = new context.module.DownloaderManager();
    manager.groupsAtom.set([
        { publicId: "group", sourcePublicId: "playlist", items: [item] },
    ]);
    return { manager, http, messages, listeners, timers };
}
test("delete disappears immediately, blocks duplicate requests and survives refresh", async () => {
    const { manager, http } = setup();
    let resolve,
        calls = 0;
    http.deleteDownload = () => {
        calls++;
        return new Promise((done) => {
            resolve = done;
        });
    };
    const pending = manager.runActionAsync(item, "delete");
    assert.equal(manager.groupsAtom.get()[0].items.length, 0);
    await manager.runActionAsync(item, "delete");
    assert.equal(calls, 1);
    await manager.refreshAsync();
    assert.equal(manager.groupsAtom.get()[0].items.length, 0);
    resolve(ok({}));
    await pending;
    assert.equal(manager.pendingAtom.get().download, undefined);
});
test("failed deletion restores card even if recovery fetch fails", async () => {
    const { manager, http, messages } = setup();
    http.deleteDownload = async () => failure();
    http.getDownloads = async () => failure();
    await manager.runActionAsync(item, "delete");
    assert.equal(manager.groupsAtom.get()[0].items[0].publicId, "download");
    assert.equal(messages[0], "Server unavailable");
});
test("retry shows queued progress immediately and rolls back HTTP errors", async () => {
    const { manager, http, messages } = setup();
    let resolve;
    http.retryDownload = () =>
        new Promise((done) => {
            resolve = done;
        });
    const pending = manager.runActionAsync(item, "retry");
    assert.equal(manager.groupsAtom.get()[0].items[0].status, "PENDING");
    assert.equal(manager.groupsAtom.get()[0].items[0].progress, 0);
    resolve(failure());
    await pending;
    assert.equal(manager.groupsAtom.get()[0].items[0].status, "COMPLETED");
    assert.equal(messages[0], "Server unavailable");
});
test("websocket matches download IDs and retains updates across older HTTP data", async () => {
    const { manager, listeners, http } = setup();
    await manager.init();
    let resolve;
    http.getDownloads = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.refreshAsync();
    [...listeners.values()][0]({
        ...item,
        status: "DOWNLOADING",
        progress: 45,
    });
    resolve(ok({ downloads: [{ publicId: "group", items: [item] }] }));
    await request;
    assert.equal(manager.groupsAtom.get()[0].items[0].progress, 45);
});
test("unknown download messages coalesce refresh requests", async () => {
    const { manager, listeners, timers } = setup();
    await manager.init();
    const handler = [...listeners.values()][0];
    handler({ ...item, publicId: "new" });
    handler({ ...item, publicId: "new", progress: 15 });
    assert.equal(timers.length, 1);
});
test("adding group saves playlist root and propagates server error", async () => {
    const { manager, http } = setup();
    let saved;
    http.addMediaToLibrary = async (id) => {
        saved = id;
        return ok({});
    };
    await manager.addGroupToLibraryAsync("playlist");
    assert.equal(saved, "playlist");
    http.addMediaToLibrary = async () => failure();
    await assert.rejects(
        manager.addGroupToLibraryAsync("playlist"),
        /Server unavailable/
    );
});

test("refresh ignores downloads from a signed-out session", async () => {
    const { manager, http } = setup();
    let resolve;
    http.getDownloads = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.refreshAsync();
    manager.reset();
    resolve(ok({ downloads: [{ publicId: "old-user", items: [item] }] }));
    await request;
    assert.equal(manager.groupsAtom.get().length, 0);
    assert.equal(manager.loadingAtom.get(), true);
});
