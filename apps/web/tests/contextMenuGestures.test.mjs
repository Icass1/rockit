import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const fixture = {
    index: 0,
    refs: [],
    listeners: new Map(),
    open: false,
    pos: null,
};
globalThis.__menuFixture = fixture;
fixture.context = {
    get _contextMenuOpen() {
        return fixture.open;
    },
    _setContextMenuOpen: (next) => {
        fixture.open = typeof next === "function" ? next(fixture.open) : next;
    },
    _setContextMenuPos: (next) => {
        fixture.pos = next;
    },
    _contextMenuDivRef: { current: { contains: (node) => node === "menu" } },
};
const modules = {
    react: `const f=globalThis.__menuFixture;export const useRef=value=>{const i=f.index++;return f.refs[i]??=( {current:value} );};export const useEffect=effect=>effect();`,
    "react/jsx-runtime":
        "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;",
    "@/components/ContextMenu/context":
        "export const useContextMenu=()=>globalThis.__menuFixture.context;",
};
const result = await build({
    absWorkingDir: fileURLToPath(new URL("..", import.meta.url)),
    entryPoints: ["components/ContextMenu/Trigger.tsx"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    jsx: "automatic",
    plugins: [
        {
            name: "menu-fixtures",
            setup(builder) {
                builder.onResolve({ filter: /^(react|@\/)/ }, (args) =>
                    modules[args.path]
                        ? { path: args.path, namespace: "fixtures" }
                        : undefined
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixtures" },
                    (args) => ({ contents: modules[args.path], loader: "js" })
                );
            },
        },
    ],
});
const { default: Trigger } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
function setup() {
    Object.assign(fixture, {
        index: 0,
        refs: [],
        listeners: new Map(),
        open: false,
        pos: null,
    });
    globalThis.document = {
        addEventListener: (type, fn) => fixture.listeners.set(type, fn),
        removeEventListener: (type) => fixture.listeners.delete(type),
    };
    const target = {
        contains: (node) => node === target,
        getBoundingClientRect: () => ({ left: 12, top: 24 }),
    };
    function render() {
        fixture.index = 0;
        const element = Trigger({ children: "Card" });
        element.props.ref.current = target;
        return element.props;
    }
    const props = render();
    const open = () => {
        props.onContextMenu({ clientX: 20, clientY: 30, preventDefault() {} });
        render();
    };
    return { target, props, open };
}

test("releasing the right button does not immediately close the menu it just opened", () => {
    const { target, open } = setup();
    open();
    fixture.listeners.get("mouseup")({ type: "mouseup", button: 2, target });
    assert.equal(fixture.open, true);
    fixture.listeners.get("mouseup")({
        type: "mouseup",
        button: 0,
        target: "outside",
    });
    assert.equal(fixture.open, false);
});

test("opening another context menu closes the previous one, not its own trigger", () => {
    const { target, open } = setup();
    open();
    fixture.listeners.get("contextmenu")({ type: "contextmenu", target });
    assert.equal(fixture.open, true);
    fixture.listeners.get("contextmenu")({
        type: "contextmenu",
        target: "another card",
    });
    assert.equal(fixture.open, false);
});

test("Shift+F10 opens a contextual menu on a normal link without requiring a pin button", () => {
    const { target, props } = setup();
    let prevented = false;
    props.onKeyDown({
        key: "F10",
        shiftKey: true,
        target,
        currentTarget: target,
        defaultPrevented: false,
        preventDefault() {
            prevented = true;
        },
        stopPropagation() {},
    });
    assert(prevented);
    assert(fixture.open);
    assert.deepEqual(fixture.pos, [12, 24]);
});
