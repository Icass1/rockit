/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
const { outputFiles } = await build({
    stdin: {
        contents: `export {DownloaderManager} from './lib/managers/downloaderManager'; export {BaseHttp} from '../../packages/shared/src/http/baseHttp';`,
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
        browseDownloads: async () =>
            ok({
                totals: { total: 1, active: 0, completed: 1, failed: 0 },
                hasMore: false,
                page: 0,
                groups: [
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
        manageDownloadGroup: async () => ok({}),
        getDownloadGroupItems: async (_id, offset) =>
            ok({ items: [item], offset, hasMore: false, total: 1 }),
    };
    const rockIt = {
        notificationManager: {
            notify: (_type, message) => messages.push(message),
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
        URLSearchParams,
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
    return {
        manager,
        http,
        messages,
        listeners,
        timers,
        transport: context.module.BaseHttp,
    };
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
    http.browseDownloads = async () => failure();
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
    http.browseDownloads = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.refreshAsync();
    [...listeners.values()][0]({
        ...item,
        status: "DOWNLOADING",
        progress: 45,
    });
    resolve(ok({ groups: [{ publicId: "group", items: [item] }] }));
    await request;
    assert.equal(manager.groupsAtom.get()[0].items[0].progress, 45);
});
test("unknown download messages coalesce refresh requests", async () => {
    const { manager, listeners, timers } = setup();
    await manager.init();
    manager.watch();
    await manager.refreshAsync();
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
    http.browseDownloads = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.refreshAsync();
    manager.reset();
    resolve(ok({ groups: [{ publicId: "old-user", items: [item] }] }));
    await request;
    assert.equal(manager.groupsAtom.get().length, 0);
    assert.equal(manager.loadingAtom.get(), true);
});

test("progress bursts publish once and retain unaffected group references", async () => {
    const { manager, listeners, timers } = setup();
    const other = {
        publicId: "other",
        items: [{ ...item, publicId: "other-item" }],
    };
    manager.groupsAtom.set([...manager.groupsAtom.get(), other]);
    await manager.init();
    const handler = [...listeners.values()][0];
    for (let progress = 1; progress <= 100; progress++)
        handler({ ...item, status: "DOWNLOADING", progress });
    assert.equal(timers.length, 1);
    timers[0]();
    assert.equal(manager.groupsAtom.get()[0].items[0].progress, 100);
    assert.equal(manager.groupsAtom.get()[1], other);
});

test("events do not fetch history while the downloads screen is unmounted", async () => {
    const { manager, listeners, timers } = setup();
    await manager.init();
    [...listeners.values()][0]({
        ...item,
        publicId: "unseen",
        status: "COMPLETED",
    });
    assert.equal(timers.length, 0);
});

test("changing a filter rejects the previous page response", async () => {
    const { manager, http } = setup();
    let resolve;
    http.browseDownloads = () =>
        new Promise((done) => {
            resolve = done;
        });
    const old = manager.refreshAsync();
    http.browseDownloads = async () =>
        ok({
            groups: [{ publicId: "filtered", items: [] }],
            totals: { total: 10 },
            hasMore: false,
        });
    await manager.setViewAsync({ status: "failed" });
    resolve(
        ok({
            groups: [{ publicId: "stale", items: [] }],
            totals: { total: 10 },
        })
    );
    await old;
    assert.equal(manager.groupsAtom.get()[0].publicId, "filtered");
    assert.equal(manager.viewAtom.get().page, 0);
});

test("track pagination replaces the old page and ignores late responses", async () => {
    const { manager, http } = setup();
    let resolve;
    http.getDownloadGroupItems = () =>
        new Promise((done) => {
            resolve = done;
        });
    const old = manager.openGroupAsync("group", 0);
    http.getDownloadGroupItems = async () =>
        ok({ items: [{ ...item, publicId: "page-two" }], hasMore: false });
    await manager.openGroupAsync("group", 48);
    resolve(ok({ items: [item], hasMore: true }));
    await old;
    assert.equal(manager.detailAtom.get().offset, 48);
    assert.equal(manager.detailAtom.get().items.length, 1);
    assert.equal(manager.detailAtom.get().items[0].publicId, "page-two");
});

test("whole-group delete is immediate and restores context on server rejection", async () => {
    const { manager, http, messages } = setup();
    const group = manager.groupsAtom.get()[0];
    let resolve;
    http.manageDownloadGroup = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.runGroupActionAsync(group, "delete");
    assert.equal(manager.groupsAtom.get().length, 0);
    await manager.runGroupActionAsync(group, "delete");
    resolve(failure());
    await request;
    assert.equal(manager.groupsAtom.get()[0].publicId, "group");
    assert.equal(messages[0], "Server unavailable");
});

test("redownloading a whole group immediately marks its expanded tracks as queued", async () => {
    const { manager, http } = setup();
    const group = { ...manager.groupsAtom.get()[0], total: 1000, active: 0 };
    manager.groupsAtom.set([group]);
    manager.detailAtom.set({
        groupId: "group",
        offset: 0,
        items: [item],
        loading: false,
        hasMore: true,
        error: null,
    });
    let resolve;
    http.manageDownloadGroup = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.runGroupActionAsync(group, "retry");
    assert.equal(manager.detailAtom.get().items[0].status, "PENDING");
    assert.equal(manager.groupsAtom.get()[0].active, 1000);
    resolve(failure());
    await request;
    assert.equal(manager.detailAtom.get().items[0].status, "COMPLETED");
});

test("a late group failure cannot restore the signed-out user's groups", async () => {
    const { manager, http } = setup();
    const group = manager.groupsAtom.get()[0];
    let resolve;
    http.manageDownloadGroup = () =>
        new Promise((done) => {
            resolve = done;
        });
    const request = manager.runGroupActionAsync(group, "delete");
    manager.reset();
    resolve(failure());
    await request;
    assert.equal(manager.groupsAtom.get().length, 0);
});

test("track page requests preserve search text and status in the actual HTTP transport", async () => {
    const { transport } = setup();
    let requested;
    transport.apiGetAsync = async (path) => {
        requested = path;
        return ok({});
    };
    await transport.getDownloadGroupItems(
        "group",
        48,
        "failed",
        "Song & album"
    );
    const url = new URL(requested, "http://test");
    assert.equal(url.searchParams.get("q"), "Song & album");
    assert.equal(url.searchParams.get("status"), "failed");
    assert.equal(url.searchParams.get("offset"), "48");
});
