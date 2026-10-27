/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
    entryPoints: ["hooks/useAccountCachedData.ts"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "screen",
    tsconfig: "tsconfig.json",
    plugins: [
        {
            name: "screen-adapters",
            setup(builder) {
                builder.onResolve(
                    {
                        filter: /^(react|@nanostores\/react|@\/lib\/(http|rockit\/rockIt))$/,
                    },
                    ({ path }) => ({ path, namespace: "mock" })
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "mock" },
                    ({ path }) => ({
                        contents:
                            path === "react"
                                ? `export const useState = (...args) => globalThis.screenHooks.useState(...args);
export const useMemo = (...args) => globalThis.screenHooks.useMemo(...args);
export const useEffect = (...args) => globalThis.screenHooks.useEffect(...args);`
                                : path === "@nanostores/react"
                                  ? "export const useStore = atom => atom.get();"
                                  : path === "@/lib/http"
                                    ? "export const Http = {};"
                                    : "export const rockIt = globalThis.screenRockIt;",
                    })
                );
            },
        },
    ],
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
const ok = (result) => ({ isOk: () => true, result });

// A deterministic hook adapter lets us control request order without timers or a DOM.
function fixture() {
    let username = "alice",
        slot = 0;
    const slots = [],
        effects = [],
        calls = [],
        cached = [];
    const same = (a, b) =>
        a && a.length === b.length && a.every((value, i) => value === b[i]);
    globalThis.screenHooks = {
        useState(initial) {
            const index = slot++;
            if (!(index in slots)) slots[index] = initial;
            return [
                slots[index],
                (value) => {
                    slots[index] = value;
                },
            ];
        },
        useMemo(create, deps) {
            const index = slot++;
            if (!same(slots[index]?.deps, deps))
                slots[index] = { deps, value: create() };
            return slots[index].value;
        },
        useEffect(effect, deps) {
            const index = slot++;
            if (same(slots[index]?.deps, deps)) return;
            slots[index]?.cleanup?.();
            const record = { deps };
            slots[index] = record;
            effects.push(() => {
                record.cleanup = effect();
            });
        },
    };
    globalThis.screenRockIt = {
        userManager: {
            usernameAtom: { get: () => username },
            loggedInAtom: { get: () => true },
        },
    };
    const useScreen = new Function(
        `${outputFiles[0].text}; return screen.default;`
    )();
    const fetchData = () => new Promise((resolve) => calls.push(resolve));
    const loadCached = (user) =>
        new Promise((resolve) => cached.push({ user, resolve }));
    const saved = [];
    const saveCached = async (user, data) => {
        saved.push({ user, data });
    };
    return {
        calls,
        cached,
        saved,
        account: (user) => {
            username = user;
        },
        render() {
            slot = 0;
            const result = useScreen(fetchData, loadCached, saveCached);
            effects.splice(0).forEach((effect) => effect());
            return result;
        },
        cleanup() {
            delete globalThis.screenHooks;
            delete globalThis.screenRockIt;
        },
    };
}

test("cached content is immediate while the live response replaces it in the same screen", async () => {
    const f = fixture();
    try {
        assert.equal(f.render().data, undefined);
        f.cached[0].resolve({ version: "cached" });
        await flush();
        assert.equal(f.render().data.version, "cached");
        assert.equal(f.render().loading, true);
        f.calls[0](ok({ version: "fresh" }));
        await flush();
        assert.equal(f.render().data.version, "fresh");
        assert.equal(f.render().loading, false);
        assert.deepEqual(f.saved, [
            { user: "alice", data: { version: "fresh" } },
        ]);
    } finally {
        f.cleanup();
    }
});

test("late cache reads and old-account requests cannot overwrite fresh current-account data", async () => {
    const f = fixture();
    try {
        f.render();
        f.account("bob");
        assert.equal(f.render().data, undefined);
        f.calls[1](ok({ version: "bob-fresh" }));
        await flush();
        f.cached[1].resolve({ version: "bob-old" });
        f.cached[0].resolve({ version: "alice-old" });
        f.calls[0](ok({ version: "alice-late" }));
        await flush();
        assert.equal(f.render().data.version, "bob-fresh");
        assert.deepEqual(f.saved, [
            { user: "bob", data: { version: "bob-fresh" } },
        ]);
    } finally {
        f.cleanup();
    }
});
