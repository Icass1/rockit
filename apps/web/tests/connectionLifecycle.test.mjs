/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {WebSocketManager} from './lib/managers/webSocketManger';
export {ConnectionLifecycle} from './lib/runtime/connectionLifecycle';
export {createAtom} from '../../packages/shared/src/lib/store';`,
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
            name: "runtime-isolation",
            setup(builder) {
                builder.onResolve(
                    { filter: /^@\/lib\/rockit\/rockIt$/ },
                    () => ({
                        path: "runtime",
                        namespace: "fixture",
                    })
                );
                builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                    contents: "export const rockIt = undefined;",
                }));
            },
        },
    ],
});
const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
};
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
function setup() {
    const timers = new Map();
    const sockets = [];
    let timerId = 0;
    let now = 0;
    let authenticated = true;
    let failures = 0;
    class Socket {
        static OPEN = 1;
        readyState = 0;
        sent = [];
        closeCalls = 0;
        constructor() {
            if (failures-- > 0) throw new Error("fixture connection failure");
            sockets.push(this);
        }
        open() {
            this.readyState = 1;
            this.onopen?.();
        }
        close() {
            this.closeCalls++;
            this.readyState = 3;
            this.onclose?.();
        }
        send(data) {
            this.sent.push(JSON.parse(data));
        }
        receive(data) {
            this.onmessage?.({ data: JSON.stringify(data) });
        }
    }
    const context = vm.createContext({
        console,
        process: { env: {} },
        WebSocket: Socket,
        setTimeout(fn, delay) {
            const id = ++timerId;
            timers.set(id, { fn, at: now + delay });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    const { WebSocketManager, ConnectionLifecycle, createAtom } =
        context.fixture;
    const manager = new WebSocketManager(() => authenticated);
    return {
        manager,
        ConnectionLifecycle,
        WebSocketManager,
        createAtom,
        sockets,
        timers,
        setAuthenticated: (value) => (authenticated = value),
        failConnections: (value) => (failures = value),
        async advance(ms) {
            now += ms;
            for (const [id, timer] of [...timers]) {
                if (timer.at > now) continue;
                timers.delete(id);
                timer.fn();
            }
            await flush();
        },
    };
}
const selection = (id) => ({
    mediaPublicId: id,
    queueMediaId: 1,
    queueType: "SORTED",
    playbackId: id,
    currentTimeMs: 0,
});

test("construction is isolated and stopped managers cannot connect through compatibility methods", async () => {
    const { manager, WebSocketManager, sockets, timers } = setup();
    assert.notEqual(manager, new WebSocketManager(() => true));
    await manager.init();
    await manager.reconnectAsync();
    await manager.send({ type: "current_queue" });
    assert.equal(sockets.length, 0);
    assert.equal(timers.size, 0);
});

test("start connects immediately once and stop permits a balanced Strict Mode restart", async () => {
    const { manager, sockets, timers } = setup();
    manager.start();
    manager.start();
    assert.equal(sockets.length, 1);
    assert.equal(timers.size, 0);
    sockets[0].open();
    assert.deepEqual(sockets[0].sent, [{ type: "playback_state" }]);
    manager.stop();
    assert.equal(sockets[0].closeCalls, 1);
    assert.equal(sockets[0].onmessage, null);
    await manager.send({ type: "current_queue" });
    assert.equal(sockets.length, 1);
    manager.start();
    assert.equal(sockets.length, 2);
    sockets[1].open();
    manager.stop();
    assert.equal(timers.size, 0);
});

test("network failures back off, sends respect the delay, and successful opens reset it", async () => {
    const { manager, sockets, advance } = setup();
    manager.start();
    sockets[0].close();
    const pending = manager.send({ type: "current_queue" });
    await flush();
    await advance(1999);
    assert.equal(sockets.length, 1);
    await advance(1);
    assert.equal(sockets.length, 2);
    sockets[1].close();
    await advance(3999);
    assert.equal(sockets.length, 2);
    await advance(1);
    sockets[2].open();
    await pending;
    assert.equal(sockets[2].sent.at(-1).type, "current_queue");
    sockets[2].close();
    await advance(2000);
    assert.equal(sockets.length, 4);
    manager.stop();
});

test("stop cancels constructor-failure retries and pending connection waits", async () => {
    const { manager, sockets, timers, failConnections, advance } = setup();
    failConnections(1);
    manager.start();
    assert.equal(timers.size, 1);
    const pending = manager.send({ type: "current_queue" });
    await flush();
    manager.stop();
    await pending;
    assert.equal(timers.size, 0);
    await advance(60000);
    assert.equal(sockets.length, 0);
});

test("late socket callbacks cannot update state or reopen a stopped/replaced connection", async () => {
    const { manager, sockets, advance } = setup();
    manager.start();
    const { onopen, onclose, onmessage } = sockets[0];
    manager.stop();
    manager.start();
    onopen();
    onclose();
    onmessage({ data: JSON.stringify({ type: "online_users", count: 99 }) });
    assert.equal(manager.onlineUsersAtom.get(), undefined);
    assert.equal(sockets[0].sent.length, 0);
    await advance(60000);
    assert.equal(sockets.length, 2);
    sockets[1].open();
    sockets[1].receive({ type: "online_users", count: 3 });
    assert.equal(manager.onlineUsersAtom.get(), 3);
    manager.stop();
});

test("callbacks from a dropped socket are ignored even within the same account generation", async () => {
    const { manager, sockets, advance } = setup();
    manager.start();
    sockets[0].open();
    const { onmessage, onclose } = sockets[0];
    sockets[0].close();
    await advance(2000);
    sockets[1].open();
    onmessage({ data: JSON.stringify({ type: "online_users", count: 99 }) });
    onclose();
    assert.equal(manager.onlineUsersAtom.get(), undefined);
    await advance(60000);
    assert.equal(sockets.length, 2);
    manager.stop();
});

test("account replacement cancels queued sends and clears playback acknowledgements", async () => {
    const { manager, sockets, timers } = setup();
    manager.start();
    manager.sendCurrentMedia(selection("superseded"));
    manager.sendCurrentMedia(selection("old"));
    const pending = manager.send({
        type: "current_queue",
        mediaPublicId: "private",
    });
    await flush();
    manager.stop();
    manager.start();
    sockets[1].open();
    await pending;
    assert.deepEqual(sockets[1].sent, [{ type: "playback_state" }]);
    const received = [];
    manager.onMessage("current_media", (message) =>
        received.push(message.playbackId)
    );
    sockets[1].receive({
        ...selection("superseded"),
        type: "current_media",
        isPlaybackOwner: false,
    });
    assert.deepEqual(received, ["superseded"]);
    manager.stop();
    assert.equal(timers.size, 0);
});

test("connection opening replays only the latest local selection once", async () => {
    const { manager, sockets } = setup();
    manager.start();
    manager.sendCurrentMedia(selection("first"));
    manager.sendCurrentMedia(selection("latest"));
    await flush();
    sockets[0].open();
    await flush();
    assert.deepEqual(
        sockets[0].sent.map((message) => message.playbackId),
        ["latest"]
    );
    sockets[0].close();
    manager.stop();
});

test("connection wait deadlines release sends and logout prevents delivery", async () => {
    const { manager, sockets, timers, advance, setAuthenticated } = setup();
    manager.start();
    const timedOut = manager.send({ type: "current_queue" });
    await flush();
    await advance(10000);
    await timedOut;
    assert.equal(timers.size, 0);
    const pending = manager.send({ type: "current_queue" });
    await flush();
    setAuthenticated(false);
    manager.stop();
    await pending;
    sockets[0].open();
    assert.equal(sockets[0].sent.length, 0);
});

function lifecycleFixture(initial = { username: "first" }) {
    const fixture = setup();
    const startup = deferred();
    const session = fixture.createAtom(initial);
    let listenerCount = 0;
    const sessionAtom = session.getReadonlyAtom();
    const bookmarks = { starts: 0, stops: 0, active: false };
    const pins = { starts: 0, stops: 0, active: false };
    const services = {
        navigationPinsManager: {
            start() {
                pins.starts++;
                pins.active = true;
            },
            stop() {
                pins.stops++;
                pins.active = false;
            },
        },
        bookmarkManager: {
            start() {
                bookmarks.starts++;
                bookmarks.active = true;
            },
            stop() {
                bookmarks.stops++;
                bookmarks.active = false;
            },
        },
        userManager: {
            sessionAtom: {
                subscribe(fn) {
                    listenerCount++;
                    const unsubscribe = sessionAtom.subscribe(fn);
                    return () => {
                        listenerCount--;
                        unsubscribe();
                    };
                },
            },
        },
        webSocketManager: fixture.manager,
        init: () => startup.promise,
    };
    return {
        ...fixture,
        startup,
        session,
        services,
        bookmarks,
        pins,
        lifecycle: new fixture.ConnectionLifecycle(services),
        listenerCount: () => listenerCount,
    };
}

test("lifecycle registers handlers before connecting and retains a connection across session metadata updates", async () => {
    const { lifecycle, startup, session, sockets, listenerCount } =
        lifecycleFixture();
    const first = lifecycle.start();
    assert.equal(lifecycle.start(), first);
    assert.equal(listenerCount(), 1);
    assert.equal(sockets.length, 0);
    startup.resolve();
    await first;
    assert.equal(sockets.length, 1);
    session.set({ username: "first", image: "new" });
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0].closeCalls, 0);
    lifecycle.stop();
    assert.equal(listenerCount(), 0);
    assert.equal(sockets[0].closeCalls, 1);
});

test("shell owns bookmark and pin startup and cleanup across deferred initialization and restarts", async () => {
    for (const restart of [false, true]) {
        const { lifecycle, startup, bookmarks, pins } = lifecycleFixture();
        const first = lifecycle.start();
        assert.equal(bookmarks.starts, 0);
        assert.equal(pins.starts, 0);
        lifecycle.stop();
        const second = restart ? lifecycle.start() : Promise.resolve();
        startup.resolve();
        await Promise.all([first, second]);
        assert.equal(bookmarks.starts, restart ? 1 : 0);
        assert.equal(bookmarks.active, restart);
        assert.equal(pins.starts, restart ? 1 : 0);
        assert.equal(pins.active, restart);
        lifecycle.stop();
        assert.equal(bookmarks.active, false);
        assert.equal(pins.active, false);
    }
});

test("late startup cannot reconnect after unmount or duplicate Strict Mode setup", async () => {
    for (const restart of [false, true]) {
        const { lifecycle, startup, sockets, listenerCount } =
            lifecycleFixture();
        const first = lifecycle.start();
        lifecycle.stop();
        const second = restart ? lifecycle.start() : Promise.resolve();
        startup.resolve();
        await Promise.all([first, second]);
        assert.equal(sockets.length, restart ? 1 : 0);
        assert.equal(listenerCount(), restart ? 1 : 0);
        lifecycle.stop();
        assert.equal(listenerCount(), 0);
    }
});

test("account changes replace connections and logout remains disconnected until a new session", async () => {
    const { lifecycle, startup, session, sockets } = lifecycleFixture();
    const starting = lifecycle.start();
    session.set({ username: "second" });
    startup.resolve();
    await starting;
    assert.equal(sockets.length, 1);
    session.set({ username: "third" });
    assert.equal(sockets[0].closeCalls, 1);
    assert.equal(sockets.length, 2);
    session.set(null);
    assert.equal(sockets[1].closeCalls, 1);
    session.set({ username: "third" });
    assert.equal(sockets.length, 3);
    lifecycle.stop();
});

test("anonymous or failed startup never opens a socket", async () => {
    const anonymous = lifecycleFixture(null);
    const starting = anonymous.lifecycle.start();
    anonymous.startup.resolve();
    await starting;
    assert.equal(anonymous.sockets.length, 0);
    anonymous.lifecycle.stop();
    const failed = lifecycleFixture();
    const rejected = failed.lifecycle.start();
    failed.startup.reject(new Error("fixture initialization failure"));
    await assert.rejects(rejected, /initialization failure/);
    assert.equal(failed.sockets.length, 0);
    failed.lifecycle.stop();
    assert.equal(failed.listenerCount(), 0);
});
