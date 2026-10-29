import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const web = fileURLToPath(new URL("..", import.meta.url));
function atom(initial) {
    let value = initial;
    const listeners = new Set();
    return {
        get: () => value,
        set(next) {
            value = next;
            for (const fn of listeners) fn(next);
        },
        listen(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        getReadonlyAtom() {
            return this;
        },
    };
}
const rockIt = {};
const fixture = { atom, rockIt, Http: {} };
globalThis.__pinsFixture = fixture;
const code = {
    "@/lib/http": "export const Http=globalThis.__pinsFixture.Http;",
    "@/lib/rockit/rockIt":
        "export const rockIt=globalThis.__pinsFixture.rockIt;",
    "@/lib/store":
        "export const createAtom=globalThis.__pinsFixture.atom;export const createArrayAtom=createAtom;",
    "@rockit/shared": "export const isSearchResult=m=>m.searchResult===true;",
};
async function load(entry) {
    const result = await build({
        absWorkingDir: web,
        entryPoints: [entry],
        bundle: true,
        platform: "node",
        format: "esm",
        write: false,
        plugins: [
            {
                name: "fixtures",
                setup(builder) {
                    builder.onResolve({ filter: /^@/ }, (args) =>
                        code[args.path]
                            ? { path: args.path, namespace: "fixtures" }
                            : undefined
                    );
                    builder.onLoad(
                        { filter: /.*/, namespace: "fixtures" },
                        (args) => ({ contents: code[args.path], loader: "js" })
                    );
                },
            },
        ],
    });
    return import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
    );
}
const { NavigationPinsManager } = await load(
    "lib/managers/navigationPinsManager.ts"
);
const { isPinnableMedia } = await load("lib/utils/navigationPins.ts");
const pin = {
    type: "album",
    publicId: "a",
    name: "Album",
    imageUrl: null,
    url: "/album/a",
};
const ok = (pins) => ({ isOk: () => true, result: { pins } });
const fail = { isOk: () => false };
const tick = () => new Promise((resolve) => setImmediate(resolve));
function gate() {
    let release;
    const promise = new Promise((resolve) => {
        release = resolve;
    });
    return { promise, release };
}
function setup() {
    globalThis.window = new EventTarget();
    globalThis.document = new EventTarget();
    document.hidden = false;
    const state = { server: [], calls: [], errors: [], success: [] };
    Object.assign(rockIt, {
        userManager: { usernameAtom: atom("A"), loggedInAtom: atom(true) },
        vocabularyManager: {
            vocabulary: {
                NAV_PINS_UPDATE_ERROR: "error",
                NAV_PIN_ADDED: "added",
                NAV_PIN_REMOVED: "removed",
            },
        },
        notificationManager: {
            notifyError: (m) => state.errors.push(m),
            notifySuccess: (m) => state.success.push(m),
        },
    });
    Object.assign(fixture.Http, {
        async getNavigationPinsAsync() {
            state.calls.push("get");
            return ok(state.server);
        },
        async pinNavigationMediaAsync({ publicId }) {
            state.calls.push("pin:" + publicId);
            state.server = [...state.server, { ...pin, publicId }];
            return ok(state.server);
        },
        async unpinNavigationMediaAsync(publicId) {
            state.calls.push("unpin:" + publicId);
            state.server = state.server.filter((p) => p.publicId !== publicId);
            return ok(state.server);
        },
    });
    return { state, manager: new NavigationPinsManager() };
}

test("only stored albums, playlists and actual artist links are pinnable", () => {
    for (const type of ["album", "playlist", "artist"])
        assert(isPinnableMedia({ ...pin, type, url: `/${type}/a` }));
    for (const type of ["song", "video", "station"])
        assert.equal(isPinnableMedia({ ...pin, type }), false);
    assert.equal(
        isPinnableMedia({ ...pin, type: "artist", url: "/user/a" }),
        false
    );
    assert.equal(isPinnableMedia({ ...pin, publicId: null }), false);
    assert.equal(isPinnableMedia({ ...pin, searchResult: true }), false);
});

test("anonymous startup is empty and does not query; login loads once", async () => {
    const { manager, state } = setup();
    rockIt.userManager.loggedInAtom.set(false);
    manager.init();
    assert.deepEqual(state.calls, []);
    assert.deepEqual(manager.pinsAtom.get(), []);
    state.server = [pin];
    rockIt.userManager.loggedInAtom.set(true);
    await tick();
    assert.deepEqual(state.calls, ["get"]);
    assert.equal(manager.pinsAtom.get()[0].publicId, "a");
});

test("a save is not optimistic and duplicate pending clicks send one request", async () => {
    const { manager, state } = setup();
    manager.init();
    await tick();
    const wait = gate();
    fixture.Http.pinNavigationMediaAsync = async () => {
        state.calls.push("pin");
        await wait.promise;
        return ok([pin]);
    };
    const first = manager.setPinnedAsync("a", true);
    await tick();
    assert.deepEqual(manager.pinsAtom.get(), []);
    assert.equal(await manager.setPinnedAsync("a", true), false);
    wait.release();
    assert.equal(await first, true);
    assert.deepEqual(state.calls, ["get", "pin"]);
    assert.equal(manager.pinsAtom.get().length, 1);
    assert.deepEqual(manager.pendingAtom.get(), []);
});

test("failed write retains shortcuts and allows recovery", async () => {
    const { manager, state } = setup();
    state.server = [pin];
    manager.init();
    await tick();
    fixture.Http.unpinNavigationMediaAsync = async () => fail;
    assert.equal(await manager.setPinnedAsync("a", false), false);
    assert.equal(manager.pinsAtom.get().length, 1);
    assert.equal(state.success.length, 0);
    assert.equal(state.errors.length, 1);
    assert.equal(manager.statusAtom.get(), "error");
    assert.deepEqual(manager.pendingAtom.get(), []);
    fixture.Http.unpinNavigationMediaAsync = async () => ok([]);
    assert.equal(await manager.setPinnedAsync("a", false), true);
    assert.deepEqual(manager.pinsAtom.get(), []);
});

test("late GET cannot overwrite a newer mutation", async () => {
    const { manager } = setup();
    const wait = gate();
    fixture.Http.getNavigationPinsAsync = async () => {
        await wait.promise;
        return ok([]);
    };
    manager.init();
    await tick();
    assert.equal(await manager.setPinnedAsync("a", true), true);
    wait.release();
    await tick();
    assert.equal(manager.pinsAtom.get().length, 1);
    assert.equal(manager.statusAtom.get(), "ready");
});

test("different pin writes are serialized so full-list responses cannot lose changes", async () => {
    const { manager, state } = setup();
    manager.init();
    await tick();
    const wait = gate();
    fixture.Http.pinNavigationMediaAsync = async ({ publicId }) => {
        state.calls.push("pin:" + publicId);
        if (publicId === "a") await wait.promise;
        state.server = [...state.server, { ...pin, publicId }];
        return ok(state.server);
    };
    const a = manager.setPinnedAsync("a", true),
        b = manager.setPinnedAsync("b", true);
    await tick();
    assert.deepEqual(state.calls, ["get", "pin:a"]);
    wait.release();
    await Promise.all([a, b]);
    assert.deepEqual(
        manager.pinsAtom.get().map((p) => p.publicId),
        ["a", "b"]
    );
});

test("account switch clears shortcuts immediately and ignores old write responses", async () => {
    const { manager, state } = setup();
    manager.init();
    await tick();
    const wait = gate();
    fixture.Http.pinNavigationMediaAsync = async () => {
        await wait.promise;
        return ok([pin]);
    };
    const prior = manager.setPinnedAsync("a", true);
    await tick();
    rockIt.userManager.loggedInAtom.set(false);
    assert.deepEqual(manager.pinsAtom.get(), []);
    rockIt.userManager.usernameAtom.set("B");
    state.server = [{ ...pin, publicId: "b" }];
    rockIt.userManager.loggedInAtom.set(true);
    await tick();
    wait.release();
    assert.equal(await prior, false);
    assert.deepEqual(
        manager.pinsAtom.get().map((p) => p.publicId),
        ["b"]
    );
    assert.deepEqual(manager.pendingAtom.get(), []);
});

test("simultaneous wake events coalesce and refresh changes from another device", async () => {
    const { manager, state } = setup();
    manager.init();
    await tick();
    const wait = gate();
    fixture.Http.getNavigationPinsAsync = async () => {
        state.calls.push("refresh");
        await wait.promise;
        return ok([pin]);
    };
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    assert.deepEqual(state.calls, ["get", "refresh"]);
    wait.release();
    await tick();
    assert.equal(manager.pinsAtom.get().length, 1);
});

test("removed default Rockit lists are not recreated by refresh or login", async () => {
    const { manager, state } = setup();
    state.server = ["liked", "most-listened", "recent-mix"].map((key) => ({
        ...pin,
        type: "playlist",
        publicId: key,
        builtinKey: key,
        url: `/playlist/${key}`,
    }));
    manager.init();
    await tick();
    assert.equal(await manager.setPinnedAsync("liked", false), true);
    await manager.refreshAsync();
    assert.deepEqual(
        manager.pinsAtom.get().map((item) => item.publicId),
        ["most-listened", "recent-mix"]
    );
    rockIt.userManager.loggedInAtom.set(false);
    rockIt.userManager.loggedInAtom.set(true);
    await tick();
    assert.deepEqual(
        manager.pinsAtom.get().map((item) => item.publicId),
        ["most-listened", "recent-mix"]
    );
});
