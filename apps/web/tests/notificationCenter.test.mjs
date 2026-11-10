import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const web = fileURLToPath(new URL("..", import.meta.url));
const state = { unread: 45, calls: [], fail: false, throws: false, wait: null };
globalThis.window = {};
globalThis.__notificationTest = {
    Http: {
        async listNotifications(limit, offset, unreadOnly) {
            state.calls.push(["list", offset, unreadOnly]);
            return {
                isOk: () => true,
                result: {
                    items: [],
                    unreadCount: state.unread,
                    totalCount: unreadOnly ? state.unread : 80,
                },
            };
        },
        async markAllNotificationsRead() {
            state.calls.push(["all"]);
            if (state.wait) await state.wait;
            if (state.throws) throw Error("Offline");
            if (!state.fail) state.unread = 0;
            return { isOk: () => !state.fail, message: "Failed" };
        },
    },
    rockIt: {},
};
const bundle = await build({
    entryPoints: [`${web}/lib/managers/notificationManager.ts`],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [
        {
            name: "fixtures",
            setup(builder) {
                builder.onResolve(
                    { filter: /^(@\/lib\/(http|rockit\/rockIt)|sonner)$/ },
                    (args) => ({ path: args.path, namespace: "fixtures" })
                );
                builder.onLoad({ filter: /.*/, namespace: "fixtures" }, () => ({
                    contents:
                        "export const {Http, rockIt} = globalThis.__notificationTest; export const toast={dismiss(){}};",
                    loader: "js",
                }));
            },
        },
    ],
});
const { NotificationManager } = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const sessions = new WeakMap();
function createManager() {
    let onSession;
    const manager = new NotificationManager({
        userManager: {
            sessionAtom: {
                subscribe(listener) {
                    onSession = listener;
                    listener({ username: "alice" });
                    return () => {};
                },
            },
        },
        webSocketManager: { onMessage() {}, offMessage() {} },
    });
    manager.start();
    sessions.set(manager, (username) => onSession({ username }));
    return manager;
}

test("mark all updates every page and refreshes the active unread filter", async () => {
    const manager = createManager();
    manager.setPage(20, true);
    await manager.refreshAsync();
    assert.equal(manager.unreadCountAtom.get(), 45);
    assert.equal(await manager.markAllReadAsync(), true);
    assert.equal(manager.offset, 0);
    assert.equal(manager.unreadCountAtom.get(), 0);
    assert.equal(manager.totalCountAtom.get(), 0);
    assert.deepEqual(state.calls.at(-1), ["list", 0, true]);
    assert.equal(manager.loadingAtom.get(), false);
    assert.equal(manager.actionPendingAtom.get(), false);
});

test("failed updates preserve counts and release the busy state", async () => {
    const manager = createManager();
    state.unread = 5;
    state.fail = true;
    await manager.refreshAsync();
    assert.equal(await manager.markAllReadAsync(), false);
    assert.equal(manager.unreadCountAtom.get(), 5);
    assert.equal(manager.errorAtom.get(), "Failed");
    state.throws = true;
    assert.equal(await manager.markAllReadAsync(), false);
    assert.equal(manager.actionPendingAtom.get(), false);
    assert.equal(manager.unreadCountAtom.get(), 5);
    state.fail = false;
    state.throws = false;
});

test("pending bulk updates suppress duplicates and cannot update a different account", async () => {
    const manager = createManager();
    let release;
    state.wait = new Promise((resolve) => {
        release = resolve;
    });
    const pending = manager.markAllReadAsync();
    assert.equal(manager.actionPendingAtom.get(), true);
    assert.equal(await manager.markAllReadAsync(), false);
    sessions.get(manager)("bob");
    release();
    assert.equal(await pending, false);
    assert.equal(manager.unreadCountAtom.get(), 0);
    assert.equal(manager.actionPendingAtom.get(), false);
    state.wait = null;
});
