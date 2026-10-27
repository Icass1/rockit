/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    entryPoints: [
        new URL("../lib/managers/stationManager.ts", import.meta.url).pathname,
    ],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "radioModule",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "mocks",
            setup(b) {
                b.onResolve({ filter: /^\//, namespace: "mock" }, (args) => ({
                    path: args.path,
                    namespace: "file",
                }));
                b.onResolve(
                    {
                        filter: /^(@rockit\/shared|@\/lib\/(http|rockit\/rockIt|store))$/,
                    },
                    (a) => ({ path: a.path, namespace: "mock" })
                );
                b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
                    contents:
                        path === "@rockit/shared"
                            ? `export const isSearchResult = m => m.searchResult === true;
            export { BaseStationResponseSchema } from ${JSON.stringify(new URL("../../../packages/shared/src/dto/baseStationResponse.ts", import.meta.url).pathname)};`
                            : path.endsWith("http")
                              ? "export const Http = globalThis.http;"
                              : path.endsWith("rockIt")
                                ? "export const rockIt = globalThis.rockIt;"
                                : "export const createAtom = initial => { let value = initial; return {set: v => value = v, get: () => value, getReadonlyAtom() { return this; }}; };",
                }));
            },
        },
    ],
});
function setup(http = {}) {
    const played = [],
        errors = [];
    let now = 100;
    class Clock extends Date {
        static now() {
            return now;
        }
    }
    const rockIt = {
        queueManager: {
            setMedia(items) {
                played.push(items[0]);
            },
            moveToMedia() {},
        },
        mediaPlayerManager: { play() {} },
        notificationManager: {
            notifyError(message) {
                errors.push(message);
            },
        },
        vocabularyManager: { vocabulary: { RADIO_UNAVAILABLE: "Unavailable" } },
    };
    const context = vm.createContext({ http, rockIt, Date: Clock });
    vm.runInContext(outputFiles[0].text, context);
    return {
        manager: new context.radioModule.StationManager(),
        played,
        errors,
        advance: () => (now += 300_001),
    };
}
const ok = (result) => ({ isOk: () => true, result });
const station = (id) => ({
    type: "station",
    publicId: id,
    streamUrl: `https://test/${id}`,
    provider: "radio",
    providerUrl: `/radio/station/${id}`,
    name: id,
    imageUrl: "",
    country: null,
    countryCode: null,
    codec: null,
    bitrate: null,
    tags: null,
    homepage: null,
    geoLat: null,
    geoLong: null,
});
function deferred() {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
}

test("country requests share in-flight work, reuse results, and expire", async () => {
    let calls = 0;
    const pending = deferred();
    const { manager, advance } = setup({
        getStationsByCountry: () => {
            calls++;
            return pending.promise;
        },
    });
    const first = manager.getByCountry("Spain"),
        second = manager.getByCountry("Spain");
    assert.equal(first, second);
    pending.resolve(ok([station("a")]));
    await first;
    await manager.getByCountry("Spain");
    assert.equal(calls, 1);
    advance();
    await manager.getByCountry("Spain");
    assert.equal(calls, 2);
});
test("failed requests can be retried and search uses only the radio endpoint", async () => {
    let calls = 0;
    const { manager } = setup({
        searchStations: async (query) => {
            calls++;
            assert.equal(query.toLowerCase(), "jazz");
            return calls === 1
                ? { isOk: () => false, message: "offline" }
                : ok({ results: [{ name: "Jazz" }] });
        },
    });
    await assert.rejects(manager.search(" jazz "), /offline/);
    assert.equal((await manager.search("jazz"))[0].name, "Jazz");
    await manager.search("JAZZ");
    assert.equal(calls, 2);
});
test("late station lookups cannot replace a newer playback choice", async () => {
    const a = deferred(),
        b = deferred();
    const { manager, played } = setup({
        getStation: (id) => (id === "a" ? a.promise : b.promise),
    });
    const first = manager.playStationByPublicId("a"),
        second = manager.playStationByPublicId("b");
    b.resolve(ok(station("b")));
    await second;
    a.resolve(ok(station("a")));
    await first;
    assert.deepEqual(
        played.map((item) => item.publicId),
        ["b"]
    );
});
test("known stations play without a lookup and invalidate older requests", async () => {
    const pending = deferred();
    const { manager, played } = setup({ getStation: () => pending.promise });
    const lookup = manager.playStationByPublicId("a");
    await manager.setAndPlayStation(station("saved"));
    pending.resolve(ok(station("a")));
    await lookup;
    assert.deepEqual(
        played.map((item) => item.publicId),
        ["saved"]
    );
});
test("missing streams report an error without destroying the queue", async () => {
    const { manager, played, errors } = setup();
    await manager.setAndPlayStation({ ...station("a"), streamUrl: null });
    assert.equal(played.length, 0);
    assert.deepEqual(errors, ["Unavailable"]);
});
test("cache stays bounded and map country names match the radio catalogue", async () => {
    const calls = [];
    const { manager } = setup({
        getStationsByCountry: async (country) => {
            calls.push(country);
            return ok([]);
        },
    });
    await manager.getByCountry("United States of America");
    assert.equal(calls[0], "United%20States");
    for (let i = 0; i < 31; i++) await manager.getByCountry(`country-${i}`);
    await manager.getByCountry("United States of America");
    assert.equal(calls.length, 33);
});

const triggerBundle = await build({
    entryPoints: [
        new URL("../components/ContextMenu/Trigger.tsx", import.meta.url)
            .pathname,
    ],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "triggerModule",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "trigger-hooks",
            setup(b) {
                b.onResolve(
                    {
                        filter: /^(react|react\/jsx-runtime|@\/components\/ContextMenu\/context)$/,
                    },
                    (a) => ({ path: a.path, namespace: "mock" })
                );
                b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
                    contents:
                        path === "react"
                            ? "export const useRef = current => ({current}); export const useEffect = () => {};"
                            : path === "react/jsx-runtime"
                              ? "export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;"
                              : "export const useContextMenu = () => globalThis.menu;",
                }));
            },
        },
    ],
});
function triggerSetup() {
    let timer,
        opened = false;
    const context = vm.createContext({
        menu: {
            _setContextMenuOpen(fn) {
                opened = fn(opened);
            },
            _setContextMenuPos() {},
        },
        setTimeout(fn) {
            timer = fn;
            return 1;
        },
        clearTimeout() {
            timer = undefined;
        },
    });
    vm.runInContext(triggerBundle.outputFiles[0].text, context);
    const element = context.triggerModule.default({
        children: "Radio",
        openOnLeftClick: false,
    });
    return {
        props: element.props,
        hold() {
            timer?.();
        },
        opened: () => opened,
    };
}
test("a short touch preserves the native click needed to play a station", () => {
    const { props, opened } = triggerSetup();
    let prevented = false;
    props.onTouchStart({
        touches: [{ clientX: 10, clientY: 20 }],
        preventDefault() {
            prevented = true;
        },
    });
    props.onTouchEnd();
    assert.equal(prevented, false);
    assert.equal(opened(), false);
});
test("a long press opens options and suppresses the following playback click", () => {
    const { props, hold, opened } = triggerSetup();
    props.onTouchStart({ touches: [{ clientX: 10, clientY: 20 }] });
    hold();
    assert.equal(opened(), true);
    props.onContextMenu({ preventDefault() {} });
    let prevented = false,
        stopped = false;
    props.onClickCapture({
        preventDefault() {
            prevented = true;
        },
        stopPropagation() {
            stopped = true;
        },
    });
    assert.equal(prevented, true);
    assert.equal(stopped, true);
});
