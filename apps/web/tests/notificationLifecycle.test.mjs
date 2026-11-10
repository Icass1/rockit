/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {NotificationManager} from './lib/managers/notificationManager';
export {createAtom} from '../../packages/shared/src/lib/store';`,
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    external: ["react"],
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "isolated-notifications",
            setup(builder) {
                builder.onResolve(
                    { filter: /^(sonner|@\/lib\/(http|rockit\/rockIt))$/ },
                    ({ path }) => ({ path, namespace: "fixture" })
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixture" },
                    ({ path }) => ({
                        contents: {
                            sonner: "export const toast=fixture.toast;",
                            "@/lib/http": "export const Http=fixture.http;",
                            "@/lib/rockit/rockIt":
                                "export const rockIt=undefined;",
                        }[path],
                    })
                );
            },
        },
    ],
});
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
const ok = (result) => ({ isOk: () => true, result });
const fail = { isOk: () => false, message: "failed" };
const page = (id, totalCount = 1) =>
    ok({ items: [{ publicId: id }], unreadCount: 1, totalCount });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup() {
    globalThis.window = {};
    const listeners = new Map();
    globalThis.document = {
        addEventListener(type, handler, capture) {
            assert.equal(capture, true);
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(handler);
        },
        removeEventListener(type, handler, capture) {
            assert.equal(capture, true);
            listeners.get(type)?.delete(handler);
        },
    };
    const dismissals = [],
        toasts = [],
        requests = [],
        handlers = new Set();
    const toast = (...args) => toasts.push(args);
    for (const name of ["error", "warning", "success"]) toast[name] = toast;
    toast.dismiss = (id) => dismissals.push(id);
    const http = {};
    for (const name of [
        "listNotifications",
        "markNotificationRead",
        "getNotificationDestination",
    ]) {
        http[name] = (...args) => {
            const response = deferred();
            requests.push({ name, args, ...response });
            return response.promise;
        };
    }
    const testModule = { exports: {} };
    new Function(
        "require",
        "module",
        "exports",
        "fixture",
        outputFiles[0].text
    )(createRequire(import.meta.url), testModule, testModule.exports, {
        http,
        toast,
    });
    const { createAtom, NotificationManager } = testModule.exports;
    const session = createAtom({ username: "first" });
    let subscriptions = 0;
    const services = {
        userManager: {
            sessionAtom: {
                subscribe(fn) {
                    subscriptions++;
                    const unsubscribe = session.subscribe(fn);
                    return () => {
                        subscriptions--;
                        unsubscribe();
                    };
                },
            },
        },
        webSocketManager: {
            onMessage(type, fn) {
                assert.equal(type, "notification_state");
                handlers.add(fn);
            },
            offMessage(type, fn) {
                assert.equal(type, "notification_state");
                handlers.delete(fn);
            },
        },
    };
    return {
        manager: new NotificationManager(services),
        session,
        requests,
        toasts,
        dismissals,
        handlers,
        subscriptions: () => subscriptions,
        listenerCount: () =>
            [...listeners.values()].reduce((count, set) => count + set.size, 0),
        pointer(type, x = 10, y = 10) {
            const props = toasts.at(-1)[0].props;
            props[type]({ clientX: x, clientY: y });
        },
        state(unreadCount, totalCount) {
            for (const fn of handlers) fn({ unreadCount, totalCount });
        },
    };
}

test("shell startup is idempotent and lazy; stop/restart balances session and socket listeners", () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    manager.start();
    assert.equal(f.subscriptions(), 1);
    assert.equal(f.handlers.size, 1);
    assert.equal(f.listenerCount(), 0);
    assert.equal(f.requests.length, 0, "Inbox stays lazy until it is opened");
    f.state(3, 8);
    assert.equal(manager.unreadCountAtom.get(), 3);
    manager.stop();
    manager.stop();
    assert.equal(f.subscriptions(), 0);
    assert.equal(f.handlers.size, 0);
    assert.equal(f.listenerCount(), 0);
    assert.equal(manager.unreadCountAtom.get(), 0);
    manager.start();
    assert.equal(f.subscriptions(), 1);
    assert.equal(f.listenerCount(), 0);
    manager.stop();
});

test("server construction and startup have no subscriptions or document side effects", () => {
    const f = setup();
    delete globalThis.window;
    delete globalThis.document;
    f.manager.start();
    f.manager.stop();
    assert.equal(f.subscriptions(), 0);
    assert.equal(f.handlers.size, 0);
    assert.equal(f.requests.length, 0);
});

test("session metadata retains inbox work; identity changes reset page, filter, counts and toasts", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    manager.setPage(20, true);
    assert.deepEqual(f.requests[0].args, [20, 20, true]);
    f.session.set({ username: "first", image: "changed" });
    f.requests[0].resolve(page("retained", 40));
    await tick();
    assert.equal(manager.notificationsAtom.get()[0].publicId, "retained");
    assert.equal(manager.offset, 20);
    f.session.set({ username: "second" });
    assert.deepEqual(manager.notificationsAtom.get(), []);
    assert.equal(manager.offset, 0);
    assert.equal(manager.totalCountAtom.get(), 0);
    const refreshing = manager.refreshAsync();
    assert.deepEqual(f.requests[1].args, [20, 0, true]);
    f.requests[1].resolve(page("second"));
    await refreshing;
    assert.equal(f.dismissals.length, 2);
    manager.stop();
});

test("late reads and failures cannot cross account replacement, logout or same-account lifecycle restart", async () => {
    for (const transition of ["account", "logout", "restart"]) {
        for (const outcome of [page("private"), fail, new Error("offline")]) {
            const f = setup();
            const { manager } = f;
            manager.start();
            const pending = manager.refreshAsync();
            if (transition === "account") {
                f.session.set({ username: "second" });
                f.session.set({ username: "first" });
            } else if (transition === "logout") f.session.set(null);
            else {
                manager.stop();
                manager.start();
            }
            if (outcome instanceof Error) f.requests[0].reject(outcome);
            else f.requests[0].resolve(outcome);
            await pending;
            assert.deepEqual(manager.notificationsAtom.get(), []);
            assert.equal(manager.totalCountAtom.get(), 0);
            assert.equal(manager.errorAtom.get(), null);
            manager.stop();
        }
    }
});

test("latest page wins and an emptied last page returns to the first page", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    manager.setPage(0);
    manager.setPage(20, true);
    f.requests[1].resolve(page("latest", 40));
    await tick();
    f.requests[0].resolve(page("stale"));
    await tick();
    assert.equal(manager.notificationsAtom.get()[0].publicId, "latest");
    const refresh = manager.refreshAsync();
    f.requests[2].resolve(ok({ items: [], unreadCount: 0, totalCount: 10 }));
    await tick();
    assert.equal(manager.offset, 0);
    assert.deepEqual(f.requests[3].args, [20, 0, true]);
    f.requests[3].resolve(page("first"));
    await refresh;
    assert.equal(manager.notificationsAtom.get()[0].publicId, "first");
    manager.stop();
});

test("signed-out and stopped inbox operations cannot issue HTTP or accept socket counts", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    f.session.set(null);
    f.state(5, 9);
    for (const stopped of [false, true]) {
        if (stopped) manager.stop();
        await manager.refreshAsync();
        assert.equal(await manager.markRead("private"), false);
        assert.equal(
            await manager.destinationAsync({ publicId: "private" }),
            null
        );
    }
    assert.equal(f.requests.length, 0);
    assert.equal(manager.unreadCountAtom.get(), 0);
});

test("stale destination lookup cannot mark a notification read for a replacement account", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    const destination = manager.destinationAsync({ publicId: "private" });
    f.session.set({ username: "second" });
    f.requests[0].resolve(ok({ url: "/playlist/private" }));
    assert.equal(await destination, null);
    assert.equal(f.requests.length, 1);
    manager.stop();
});

test("navigation is cancelled when the account changes during mark-read refresh", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    const destination = manager.destinationAsync({ publicId: "private" });
    f.requests[0].resolve(ok({ url: "/playlist/private" }));
    await tick();
    assert.equal(f.requests[1].name, "markNotificationRead");
    f.requests[1].resolve(ok({}));
    await tick();
    assert.equal(f.requests[2].name, "listNotifications");
    f.session.set({ username: "second" });
    f.session.set({ username: "first" });
    f.requests[2].resolve(page("private"));
    assert.equal(await destination, null);
    assert.deepEqual(manager.notificationsAtom.get(), []);
    manager.stop();
});

test("mark-read invalidates old list responses and returns the destination after successful refresh", async () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    const old = manager.refreshAsync();
    const destination = manager.destinationAsync({ publicId: "current" });
    f.requests[1].resolve(ok({ url: "/album/current" }));
    await tick();
    f.requests[0].resolve(page("unread"));
    await old;
    assert.deepEqual(manager.notificationsAtom.get(), []);
    f.requests[2].resolve(ok({}));
    await tick();
    f.requests[3].resolve(page("read"));
    assert.equal(await destination, "/album/current");
    assert.equal(manager.notificationsAtom.get()[0].publicId, "read");
    manager.stop();
});

test("mutation failures are handled and stale errors after cleanup cannot alter the new inbox", async () => {
    for (const action of ["markRead", "destinationAsync"]) {
        for (const stale of [false, true]) {
            for (const outcome of [fail, new Error("offline")]) {
                const f = setup();
                const { manager } = f;
                manager.start();
                const pending = manager[action](
                    action === "markRead" ? "n" : { publicId: "n" }
                );
                if (stale) {
                    manager.stop();
                    manager.start();
                }
                if (outcome instanceof Error) f.requests[0].reject(outcome);
                else f.requests[0].resolve(outcome);
                assert.equal(
                    await pending,
                    action === "markRead" ? false : null
                );
                assert.equal(
                    manager.errorAtom.get(),
                    stale
                        ? null
                        : outcome instanceof Error
                          ? "NOTIFICATIONS_LOAD_FAILED"
                          : "failed"
                );
                manager.stop();
            }
        }
    }
});

test("toast taps dismiss and drag/cancel gestures do not, including outside the shell", () => {
    const f = setup();
    const { manager } = f;
    manager.start();
    manager.notifyInfo("Fixture feedback");
    assert.equal(f.toasts.length, 1);
    f.dismissals.length = 0;
    f.pointer("onPointerDown");
    f.pointer("onPointerUp");
    assert.deepEqual(f.dismissals, [f.toasts[0][1].id]);
    f.pointer("onPointerDown");
    f.pointer("onPointerUp", 30, 10);
    f.pointer("onPointerDown");
    f.pointer("onPointerCancel");
    f.pointer("onPointerUp");
    assert.equal(f.dismissals.length, 1);
    manager.stop();
    f.dismissals.length = 0;
    manager.notifyError("Auth feedback outside the shell");
    assert.equal(f.toasts.length, 2);
    f.pointer("onPointerDown");
    f.pointer("onPointerUp");
    assert.deepEqual(f.dismissals, [f.toasts[1][1].id]);
    assert.equal(f.listenerCount(), 0);
});
