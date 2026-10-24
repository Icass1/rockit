/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    entryPoints: [
        new URL("../lib/managers/notificationManager.ts", import.meta.url)
            .pathname,
    ],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "notifications",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "notification-transport",
            setup(build) {
                build.onResolve(
                    { filter: /^(sonner|@\/lib\/http)$/ },
                    ({ path }) => ({ path, namespace: "mock" })
                );
                build.onLoad(
                    { filter: /.*/, namespace: "mock" },
                    ({ path }) => ({
                        contents:
                            path === "sonner"
                                ? "export const toast = globalThis.toast;"
                                : "export const Http = globalThis.http;",
                    })
                );
            },
        },
    ],
});
const ok = (result) => ({ isOk: () => true, isNotOk: () => false, result });
const fail = () => ({
    isOk: () => false,
    isNotOk: () => true,
    message: "Unavailable",
});
const entry = (id, overrides = {}) => ({
    id,
    message: "Finished",
    type: 3,
    category: "download",
    createdAt: 1,
    read: false,
    key: `download:${id}`,
    detail: null,
    ...overrides,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
function setup() {
    const inbox = new Map([
        ["alice", [entry("one")]],
        ["bob", [entry("two")]],
    ]);
    let account = "alice";
    const toasts = [],
        writes = [],
        data = new Map();
    const show = (...args) => toasts.push(args);
    const http = {
        getNotifications: async () =>
            ok({ items: structuredClone(inbox.get(account)) }),
        markNotificationsRead: async ({ ids }) => {
            writes.push({ account, ids });
            inbox.set(
                account,
                inbox
                    .get(account)
                    .map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
            );
            return ok({});
        },
        createNotificationActivity: async (payload) => {
            writes.push(payload);
            return ok({});
        },
        migrateLegacyNotifications: async (payload) => {
            writes.push(payload);
            return ok({});
        },
    };
    const { NotificationManager } = vm.runInNewContext(
        `${outputFiles[0].text}; notifications;`,
        {
            process,
            http,
            console,
            crypto: { randomUUID },
            toast: Object.assign(show, {
                dismiss() {},
                error: show,
                warning: show,
                success: show,
            }),
            window: { addEventListener() {}, removeEventListener() {} },
            document: { addEventListener() {} },
            localStorage: {
                getItem: (k) => data.get(k) ?? null,
                setItem: (k, v) => data.set(k, v),
            },
            setInterval: () => 1,
            clearInterval() {},
        }
    );
    return {
        NotificationManager,
        http,
        inbox,
        toasts,
        writes,
        data,
        account: (value) => {
            account = value;
        },
    };
}

test("read receipts survive a new client and closing keeps history", async () => {
    const { NotificationManager } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    manager.dismiss("one");
    await flush();
    const otherDevice = new NotificationManager();
    otherDevice.setUser("alice");
    await otherDevice.refreshAsync();
    assert.equal(otherDevice.notificationsAtom.get().length, 1);
    assert.equal(otherDevice.notificationsAtom.get()[0].read, true);
});

test("late inbox responses cannot restore a signed-out account", async () => {
    const { NotificationManager, http } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    let resolve;
    http.getNotifications = () =>
        new Promise((done) => {
            resolve = done;
        });
    const pending = manager.refreshAsync();
    await flush();
    manager.setUser();
    resolve(ok({ items: [entry("late")] }));
    await pending;
    assert.equal(manager.notificationsAtom.get().length, 0);
});

test("refresh bursts share one request and run one final refresh for newer events", async () => {
    const { NotificationManager, http } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    const requests = [];
    http.getNotifications = () =>
        new Promise((resolve) => requests.push(resolve));
    const pending = manager.refreshAsync();
    await flush();
    const overlapping = Array.from({ length: 20 }, () => manager.refreshAsync());
    await flush();
    assert.equal(requests.length, 1);
    requests[0](ok({ items: [entry("old")] }));
    await flush();
    assert.equal(requests.length, 2);
    requests[1](ok({ items: [entry("latest")] }));
    await Promise.all([pending, ...overlapping]);
    assert.equal(requests.length, 2);
    assert.equal(manager.notificationsAtom.get()[0].id, "latest");
    const next = manager.refreshAsync();
    await flush();
    assert.equal(requests.length, 3);
    requests[2](ok({ items: [] }));
    await next;
});

test("a pending refresh does not block another account or publish its final refresh", async () => {
    const { NotificationManager, http, account } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    const requests = [];
    http.getNotifications = () =>
        new Promise((resolve) => requests.push(resolve));
    const old = manager.refreshAsync();
    await flush();
    const oldAgain = manager.refreshAsync();
    account("bob");
    manager.setUser("bob");
    await flush();
    assert.equal(requests.length, 2);
    requests[1](ok({ items: [entry("bob")] }));
    await flush();
    requests[0](ok({ items: [entry("alice")] }));
    await Promise.all([old, oldAgain]);
    assert.equal(requests.length, 2);
    assert.equal(manager.notificationsAtom.get()[0].id, "bob");
});

test("a transport failure releases the shared refresh for retry", async () => {
    const { NotificationManager, http } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    http.getNotifications = async () => {
        throw new Error("offline");
    };
    await assert.rejects(manager.refreshAsync(), /offline/);
    http.getNotifications = async () => ok({ items: [entry("recovered")] });
    await manager.refreshAsync();
    assert.equal(manager.notificationsAtom.get()[0].id, "recovered");
});

test("accounts are isolated and failed read requests keep the entry unread", async () => {
    const { NotificationManager, http, account } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    http.markNotificationsRead = async () => fail();
    manager.markRead("one");
    await flush();
    assert.equal(manager.notificationsAtom.get()[0].read, false);
    account("bob");
    manager.setUser("bob");
    await manager.refreshAsync();
    assert.equal(manager.notificationsAtom.get()[0].id, "two");
});

test("server events toast once, initial history and releases stay silent", async () => {
    const { NotificationManager, inbox, toasts, writes } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    assert.equal(toasts.length, 0);
    inbox
        .get("alice")
        .unshift(entry("news", { category: "release" }), entry("done"));
    await manager.refreshAsync();
    await manager.refreshAsync();
    assert.equal(toasts.length, 1);
    manager.notify(3, "ZIP handed to browser", { category: "download" });
    await flush();
    assert.equal(writes.length, 0);
});

test("legacy history migrates with optional fields, retains backup and retries failed import", async () => {
    const { NotificationManager, http, data, writes } = setup();
    const key = "rockit.notifications.v1:alice";
    const item = { ...entry(1), key: undefined, detail: undefined, read: true };
    data.set(key, JSON.stringify({ items: [item], seen: [] }));
    http.migrateLegacyNotifications = async () => fail();
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    assert.equal(data.has(`${key}:migrated`), false);
    http.migrateLegacyNotifications = async (payload) => {
        writes.push(payload);
        return ok({});
    };
    await manager.refreshAsync();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].items[0].read, true);
    assert.equal(writes[0].items[0].detail, null);
    assert.equal(data.get(`${key}:migrated`), "true");
    assert.ok(data.get(key));
});

test("mark all sends the displayed unread ids and retains all entries", async () => {
    const { NotificationManager, inbox, writes } = setup();
    inbox.get("alice").push(entry("read", { read: true }), entry("unread"));
    const manager = new NotificationManager();
    manager.setUser("alice");
    await manager.refreshAsync();
    manager.markAllRead();
    await flush();
    assert.deepEqual(Array.from(writes[0].ids), ["one", "unread"]);
    assert.equal(manager.notificationsAtom.get().length, 3);
    assert.ok(manager.notificationsAtom.get().every((n) => n.read));
});
