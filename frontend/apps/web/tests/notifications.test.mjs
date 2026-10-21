/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
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
            name: "silent-toasts",
            setup(build) {
                build.onResolve({ filter: /^sonner$/ }, () => ({
                    path: "sonner",
                    namespace: "mock",
                }));
                build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
                    contents:
                        "export const toast = Object.assign(() => {}, {dismiss() {}, error() {}, warning() {}, success() {}});",
                }));
            },
        },
    ],
});
function setup() {
    const data = new Map();
    const localStorage = {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
    };
    const { NotificationManager } = vm.runInNewContext(
        `${outputFiles[0].text}; notifications;`,
        { console, window: {}, localStorage, setTimeout, clearTimeout }
    );
    return { NotificationManager, data };
}
const send = (manager, key) =>
    manager.notify(1, "Finished", { category: "download", key, toast: false });
test("read and dismissed events survive reload; users are isolated", () => {
    const { NotificationManager } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    send(manager, "job:1");
    send(manager, "job:1");
    assert.equal(manager.notificationsAtom.get().length, 1);
    manager.markAllRead();
    const restored = new NotificationManager();
    restored.setUser("alice");
    assert.equal(restored.notificationsAtom.get()[0].read, true);
    restored.clearRead();
    send(restored, "job:1");
    assert.equal(restored.notificationsAtom.get().length, 0);
    send(restored, "job:2");
    restored.setUser("bob");
    assert.equal(restored.notificationsAtom.get().length, 0);
    restored.setUser("alice");
    assert.equal(restored.notificationsAtom.get().length, 1);
    restored.setUser();
    assert.equal(restored.notificationsAtom.get().length, 0);
});
test("invalid storage recovers and history is bounded", () => {
    const { NotificationManager, data } = setup();
    data.set(
        "rockit.notifications.v1:alice",
        '{"items":[{"id":"bad"}],"seen":[]}'
    );
    const manager = new NotificationManager();
    manager.setUser("alice");
    for (let i = 0; i < 110; i++) send(manager, `job:${i}`);
    assert.equal(manager.notificationsAtom.get().length, 100);
    assert.equal(manager.notificationsAtom.get()[0].key, "job:109");
    manager.markRead(manager.notificationsAtom.get()[0].id);
    assert.equal(
        manager.notificationsAtom.get().filter((n) => n.read).length,
        1
    );
});
test("closed release announcements stay read without duplicates after reload", () => {
    const { NotificationManager } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    const vocabulary = {
        NOTIFICATIONS_RELEASE_TITLE: "News",
        NOTIFICATIONS_RELEASE_DETAIL: "Details",
    };
    manager.announceReleases(vocabulary);
    manager.announceReleases(vocabulary);
    assert.equal(manager.notificationsAtom.get().length, 1);
    manager.dismiss(manager.notificationsAtom.get()[0].id);
    const restored = new NotificationManager();
    restored.setUser("alice");
    restored.announceReleases(vocabulary);
    assert.equal(restored.notificationsAtom.get().length, 1);
    assert.equal(restored.notificationsAtom.get()[0].read, true);
});

test("closing notifications retains history and persists only the selected read state", () => {
    const { NotificationManager } = setup();
    const manager = new NotificationManager();
    manager.setUser("alice");
    send(manager, "first");
    send(manager, "second");
    const id = manager.notificationsAtom.get()[0].id;
    manager.dismiss(id);
    manager.dismiss(id);
    const restored = new NotificationManager();
    restored.setUser("alice");
    send(restored, "second");
    assert.equal(restored.notificationsAtom.get().length, 2);
    assert.equal(
        restored.notificationsAtom.get().filter((n) => n.read).length,
        1
    );
    assert.equal(
        restored.notificationsAtom.get().filter((n) => !n.read).length,
        1
    );
    assert.equal(
        restored.notificationsAtom.get().find((n) => n.id === id).read,
        true
    );
});
