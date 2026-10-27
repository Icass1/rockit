/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const managerBundle = await build({
    entryPoints: [new URL("../lib/managers/notificationManager.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "iife", globalName: "notifications",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [{ name: "notification-transport", setup(builder) {
        builder.onResolve({ filter: /^(sonner|@\/lib\/http)$/ }, ({ path }) => ({ path, namespace: "mock" }));
        builder.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({ contents: path === "sonner" ? "export const toast = globalThis.toast;" : "export const Http = globalThis.http;" }));
    }}],
});
const helpersBundle = await build({
    entryPoints: [new URL("../lib/notifications.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "iife", globalName: "helpers",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
});
function ok(result) { return { result, isOk: () => true, isNotOk: () => false }; }
function entry(id) { return { publicId: id, eventKey: "APPLICATION_MESSAGE", vocabularyKey: "NOTIFICATION_APPLICATION_MESSAGE", replacements: [{ key: "MESSAGE", value: "Hello" }], dateAdded: "2026-10-27T10:00:00Z", readAt: null, destination: null }; }
function setup() {
    const calls = [];
    let response = { items: [entry("one")], unreadCount: 12, totalCount: 12 };
    const http = {
        listNotifications: async (...args) => { calls.push(args); return ok(response); },
        markNotificationRead: async () => ok(entry("one")),
        getNotificationDestination: async () => ok({ url: "/settings", newTab: false }),
    };
    const toasts = [];
    const toast = (...args) => toasts.push(args);
    for (const name of ["error", "success", "warning"]) toast[name] = toast;
    toast.dismiss = () => {};
    const context = vm.createContext({ console, http, toast, crypto: { randomUUID },
        setTimeout, clearTimeout, setInterval: () => 1, clearInterval: () => {},
        window: { addEventListener() {}, removeEventListener() {} },
        document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    });
    vm.runInContext(managerBundle.outputFiles[0].text, context);
    const manager = new context.notifications.NotificationManager();
    return { manager, http, calls, toasts, setResponse(value) { response = value; } };
}
async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)); }

test("uses server unread counts rather than counting the loaded page", async () => {
    const { manager } = setup(); manager.setUser("alice"); await settle();
    assert.equal(manager.notificationsAtom.get().length, 1);
    assert.equal(manager.unreadCountAtom.get(), 12);
});
test("pagination requests include offset and unread filtering", async () => {
    const { manager, calls } = setup(); manager.setUser("alice"); await settle();
    manager.setPage(5, true); await settle();
    assert.deepEqual(calls.at(-1), [20, 5, true]);
});
test("stale requests cannot restore another account's inbox", async () => {
    const { manager, http, setResponse } = setup();
    let release; http.listNotifications = () => new Promise((resolve) => { release = resolve; });
    manager.setUser("alice");
    http.listNotifications = async () => ok({ items: [entry("bob")], unreadCount: 1, totalCount: 1 });
    setResponse({ items: [entry("bob")], unreadCount: 1, totalCount: 1 });
    manager.setUser("bob"); await settle();
    release(ok({ items: [entry("alice")], unreadCount: 1, totalCount: 1 })); await settle();
    assert.equal(manager.notificationsAtom.get()[0].publicId, "bob");
});
test("immediate UI toasts do not create server inbox activity", async () => {
    const { manager, http, toasts } = setup();
    http.createNotificationActivity = () => { throw new Error("Legacy activity API must not be called"); };
    manager.setUser("alice"); await settle();
    manager.notifySuccess("Saved");
    assert.equal(toasts.length, 1);
    assert.equal(manager.notificationsAtom.get().length, 1);
});
test("failed reads preserve the inbox and failed destinations never mark read", async () => {
    const { manager, http } = setup(); manager.setUser("alice"); await settle();
    http.markNotificationRead = async () => ({ isOk: () => false, isNotOk: () => true, message: "failed" });
    assert.equal(await manager.markRead("one"), false);
    assert.equal(manager.notificationsAtom.get()[0].readAt, null);
    let reads = 0; http.markNotificationRead = async () => { reads++; return ok(entry("one")); };
    http.getNotificationDestination = async () => ({ isOk: () => false, isNotOk: () => true, message: "missing" });
    assert.equal(await manager.destinationAsync(entry("one")), null);
    assert.equal(reads, 0);
});
test("template replacements are literal and evaluated only once", () => {
    const context = vm.createContext({}); vm.runInContext(helpersBundle.outputFiles[0].text, context);
    assert.equal(context.helpers.replaceNotificationGaps("Hi {MESSAGE} {MISSING}", [{ key: "MESSAGE", value: "{MESSAGE}<b>text</b>" }]), "Hi {MESSAGE}<b>text</b> {MISSING}");
});
