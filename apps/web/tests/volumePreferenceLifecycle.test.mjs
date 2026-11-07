/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents: `export {VolumePreferenceLifecycle} from './lib/runtime/volumePreferenceLifecycle';
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
            name: "http-isolation",
            setup(builder) {
                builder.onResolve({ filter: /^@\/lib\/api\/browser$/ }, () => ({
                    path: "http",
                    namespace: "fixture",
                }));
                builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                    contents:
                        'export const Http = new Proxy({}, {get(){throw new Error("Unexpected default HTTP service")}});',
                }));
            },
        },
    ],
});
const ok = () => ({ isOk: () => true });
const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
};
function setup({
    initial = { username: "first", volume: 0.25 },
    ios = false,
} = {}) {
    const requests = [],
        errors = [],
        timers = new Map();
    let timerId = 0,
        now = 0;
    const context = vm.createContext({
        window: {},
        process: { env: {} },
        console: { error: (...args) => errors.push(args) },
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
    const { VolumePreferenceLifecycle, createAtom } = context.fixture;
    const session = createAtom(initial),
        volume = createAtom(1);
    const services = {
        userManager: { sessionAtom: session },
        mediaPlayerManager: {
            volumeAtom: volume,
            get volume() {
                return volume.get();
            },
            set volume(value) {
                volume.set(value);
            },
        },
    };
    const lifecycle = new VolumePreferenceLifecycle(
        services,
        (payload) =>
            new Promise((resolve, reject) =>
                requests.push({ payload, resolve, reject })
            ),
        () => ios
    );
    return {
        lifecycle,
        session,
        volume,
        requests,
        errors,
        timers,
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

test("construction is inert; startup restores without writing and balances subscriptions", async () => {
    const f = setup();
    assert.equal(f.session.lc, 0);
    assert.equal(f.volume.lc, 0);
    assert.equal(f.volume.get(), 1);
    f.lifecycle.start();
    f.lifecycle.start();
    assert.equal(f.volume.get(), 0.25);
    assert.equal(f.session.lc, 1);
    assert.equal(f.volume.lc, 1);
    await f.advance(1000);
    assert.equal(f.requests.length, 0);
    f.lifecycle.stop();
    f.lifecycle.stop();
    assert.equal(f.session.lc, 0);
    assert.equal(f.volume.lc, 0);
    assert.equal(f.timers.size, 0);
});

test("rapid changes debounce and an in-flight save coalesces subsequent values", async () => {
    const f = setup();
    f.lifecycle.start();
    f.volume.set(0.4);
    await f.advance(200);
    f.volume.set(0.6);
    await f.advance(299);
    assert.equal(f.requests.length, 0);
    await f.advance(1);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].payload.volume, 0.6);
    f.volume.set(0.7);
    f.volume.set(0.8);
    await f.advance(300);
    assert.equal(f.requests.length, 1);
    f.requests[0].resolve(ok());
    await flush();
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].payload.volume, 0.8);
    f.requests[1].resolve(ok());
    await flush();
    assert.equal(f.timers.size, 0);
    f.lifecycle.stop();
});

test("metadata updates preserve current volume and same-account shell restarts cancel pending writes", async () => {
    const f = setup();
    f.lifecycle.start();
    f.volume.set(0.6);
    f.session.set({ username: "first", volume: 0.25, image: "updated" });
    assert.equal(f.volume.get(), 0.6);
    f.lifecycle.stop();
    f.lifecycle.start();
    assert.equal(f.volume.get(), 0.6);
    await f.advance(1000);
    assert.equal(f.requests.length, 0);
    f.volume.set(0.8);
    await f.advance(300);
    assert.equal(f.requests[0].payload.volume, 0.8);
    f.requests[0].resolve(ok());
    await flush();
    f.lifecycle.stop();
});

test("account changes and logout cancel timers, restore new preferences and ignore anonymous changes", async () => {
    const f = setup();
    f.lifecycle.start();
    f.volume.set(0.6);
    f.session.set({ username: "second", volume: 0.9 });
    assert.equal(f.volume.get(), 0.9);
    await f.advance(1000);
    assert.equal(f.requests.length, 0);
    f.volume.set(0.5);
    f.session.set(null);
    await f.advance(1000);
    assert.equal(f.requests.length, 0);
    f.volume.set(0.8);
    await f.advance(1000);
    assert.equal(f.requests.length, 0);
    f.session.set({ username: "first", volume: 0.3 });
    assert.equal(f.volume.get(), 0.3);
    f.lifecycle.stop();
});

test("stale saves cannot drain a new account's pending volume, release its lock or report old errors", async () => {
    for (const interrupt of ["switch", "restart", "round-trip"])
        for (const reject of [true, false]) {
            const f = setup();
            f.lifecycle.start();
            f.volume.set(0.4);
            await f.advance(300);
            f.volume.set(0.5);
            if (interrupt === "restart") {
                f.lifecycle.stop();
                f.lifecycle.start();
            } else {
                f.session.set({ username: "second", volume: 0.9 });
                if (interrupt === "round-trip")
                    f.session.set({ username: "first", volume: 0.25 });
            }
            f.volume.set(0.6);
            await f.advance(300);
            assert.equal(f.requests.length, 2);
            f.volume.set(0.7);
            await f.advance(300);
            if (reject) f.requests[0].reject(new Error("old failure"));
            else f.requests[0].resolve(ok());
            await flush();
            f.volume.set(0.8);
            await f.advance(300);
            assert.equal(f.requests.length, 2);
            assert.equal(f.errors.length, 0);
            f.requests[1].resolve(ok());
            await flush();
            assert.equal(f.requests.length, 3);
            assert.equal(f.requests[2].payload.volume, 0.8);
            f.requests[2].resolve(ok());
            await flush();
            f.lifecycle.stop();
        }
});

test("live failures are handled and future writes still work", async () => {
    for (const reject of [true, false]) {
        const f = setup();
        f.lifecycle.start();
        f.volume.set(0.4);
        await f.advance(300);
        if (reject) f.requests[0].reject(new Error("offline"));
        else f.requests[0].resolve({ isOk: () => false, detail: "rejected" });
        await flush();
        assert.equal(f.errors.length, 1);
        f.volume.set(0.8);
        await f.advance(300);
        assert.equal(f.requests.length, 2);
        f.requests[1].resolve(ok());
        await flush();
        f.lifecycle.stop();
    }
});

test("iOS fixed volume and invalid saved values retain the existing fallback without saving", async () => {
    for (const ios of [true, false])
        for (const saved of [0.2, NaN, undefined]) {
            const f = setup({
                ios,
                initial: { username: "first", volume: saved },
            });
            f.lifecycle.start();
            assert.equal(
                f.volume.get(),
                ios || !Number.isFinite(saved) ? 1 : saved
            );
            await f.advance(1000);
            assert.equal(f.requests.length, 0);
            if (ios) {
                f.volume.set(0.5);
                await f.advance(1000);
                assert.equal(f.requests.length, 0);
            }
            f.lifecycle.stop();
        }
});

test("a logged-out shell restart restores preferences on the next login to the same account", () => {
    const f = setup();
    f.lifecycle.start();
    f.volume.set(0.7);
    f.lifecycle.stop();
    f.session.set(null);
    f.lifecycle.start();
    f.session.set({ username: "first", volume: 0.4 });
    assert.equal(f.volume.get(), 0.4);
    f.lifecycle.stop();
});
