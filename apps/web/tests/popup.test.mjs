/* eslint @typescript-eslint/explicit-function-return-type: "off" */
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const { outputFiles } = await build({
    stdin: {
        contents:
            "export {Popup} from './components/ui/Popup'; export {popupPosition} from './lib/utils/popupPosition';",
        resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    globalName: "module",
    jsx: "automatic",
    tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
    plugins: [
        {
            name: "popup-dom",
            setup(builder) {
                const fixtures = {
                    react: "export const useRef = (value) => ({current:value}); export const useId = () => 'popup-' + (++fixture.id); export const useEffect = (effect) => fixture.effects.push(effect); export const useLayoutEffect = (effect) => fixture.layouts.push(effect);",
                    "react/jsx-runtime":
                        "export const Fragment = 'fragment'; export const jsx = (type, props) => ({type,props}); export const jsxs = jsx;",
                    "react-dom": "export const createPortal = (node) => node;",
                    "@/hooks/useWindowSize":
                        "export default () => fixture.viewport;",
                    "@/components/providers/VocabularyProvider":
                        "export const useVocabulary = () => ({CANCEL:'Cancel'});",
                };
                builder.onResolve(
                    { filter: /^(react|react-dom|@\/)/ },
                    ({ path }) =>
                        fixtures[path] === undefined
                            ? undefined
                            : { path, namespace: "fixture" }
                );
                builder.onLoad(
                    { filter: /.*/, namespace: "fixture" },
                    ({ path }) => ({ contents: fixtures[path] })
                );
            },
        },
    ],
});
function setup(width = 1200, height = 800) {
    const handlers = new Map();
    const frames = new Map();
    const fixture = {
        id: 0,
        effects: [],
        layouts: [],
        viewport: { width, height },
    };
    const document = {
        activeElement: null,
        addEventListener(type, fn) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type).add(fn);
        },
        removeEventListener(type, fn) {
            handlers.get(type)?.delete(fn);
        },
    };
    class Element {
        constructor(name, children = []) {
            this.name = name;
            this.children = children;
            this.style = {};
            this.dataset = {};
            this.isConnected = true;
            this.offsetWidth = 240;
            this.offsetHeight = 120;
        }
        contains(target) {
            return (
                this === target ||
                this.children.some((child) => child.contains(target))
            );
        }
        querySelectorAll() {
            return this.children;
        }
        querySelector() {
            return null;
        }
        getClientRects() {
            return [{}];
        }
        getBoundingClientRect() {
            return { right: 300, bottom: 220 };
        }
        focus() {
            document.activeElement = this;
        }
        matches() {
            return false;
        }
    }
    document.body = new Element("body");
    const window = {
        innerWidth: width,
        innerHeight: height,
        addEventListener() {},
        removeEventListener() {},
    };
    const context = vm.createContext({
        fixture,
        document,
        window,
        Node: Element,
        HTMLElement: Element,
        ResizeObserver: class {
            observe() {}
            disconnect() {}
        },
        requestAnimationFrame(fn) {
            frames.set(frames.size + 1, fn);
            return frames.size;
        },
        cancelAnimationFrame(id) {
            frames.delete(id);
        },
    });
    vm.runInContext(outputFiles[0].text, context);
    function mount(options = {}) {
        const controls = [new Element("first"), new Element("second")];
        const node = new Element("popup", controls);
        fixture.layouts = [];
        fixture.effects = [];
        let closed = 0;
        let tree = context.module.Popup({
            open: true,
            onClose() {
                closed++;
            },
            children: "content",
            contentRef: { current: node },
            ...options,
        });
        while (typeof tree?.type === "function") tree = tree.type(tree.props);
        const cleanup = [...fixture.layouts, ...fixture.effects]
            .map((effect) => effect())
            .filter(Boolean);
        for (const [id, frame] of frames) {
            frames.delete(id);
            frame();
        }
        return {
            node,
            controls,
            tree,
            get closed() {
                return closed;
            },
            unmount() {
                for (const fn of cleanup.reverse()) fn();
            },
        };
    }
    function dispatch(type, event = {}) {
        for (const handler of handlers.get(type) ?? [])
            handler({
                target: document.activeElement,
                defaultPrevented: false,
                preventDefault() {
                    this.defaultPrevented = true;
                },
                stopPropagation() {},
                ...event,
            });
    }
    return {
        mount,
        dispatch,
        document,
        Element,
        handlers,
        position: context.module.popupPosition,
    };
}
test("popup focuses controls, navigates by keyboard, dismisses and restores focus", () => {
    const env = setup();
    const trigger = new env.Element("trigger");
    trigger.focus();
    const popup = env.mount();
    assert.equal(env.document.activeElement, popup.controls[0]);
    env.dispatch("keydown", { key: "ArrowDown" });
    assert.equal(env.document.activeElement, popup.controls[1]);
    env.dispatch("keydown", { key: "Home" });
    assert.equal(env.document.activeElement, popup.controls[0]);
    env.dispatch("keydown", { key: "Escape" });
    assert.equal(popup.closed, 1);
    popup.unmount();
    assert.equal(env.document.activeElement, trigger);
    assert.equal(
        [...env.handlers.values()].every((listeners) => listeners.size === 0),
        true
    );
});
test("outside interaction closes a popup while its own controls remain usable", () => {
    const env = setup();
    const popup = env.mount();
    env.dispatch("pointerdown", { target: popup.controls[0] });
    assert.equal(popup.closed, 0);
    env.dispatch("pointerdown", { target: new env.Element("outside") });
    assert.equal(popup.closed, 1);
    popup.unmount();
});
test("portalled submenu interaction preserves its parent and Escape closes only the top layer", () => {
    const env = setup();
    const parent = env.mount();
    const child = env.mount();
    env.dispatch("pointerdown", { target: child.controls[0] });
    assert.equal(parent.closed, 0);
    assert.equal(child.closed, 0);
    env.dispatch("keydown", { key: "Escape" });
    assert.equal(parent.closed, 0);
    assert.equal(child.closed, 1);
    child.unmount();
    parent.unmount();
});
test("mobile sheets keep Tab navigation within the popup", () => {
    const env = setup(390, 800);
    const popup = env.mount();
    popup.controls[1].focus();
    env.dispatch("keydown", { key: "Tab", shiftKey: false });
    assert.equal(env.document.activeElement, popup.controls[0]);
    env.dispatch("keydown", { key: "Tab", shiftKey: true });
    assert.equal(env.document.activeElement, popup.controls[1]);
    popup.unmount();
});
test("positioning keeps normal and oversized popups inside viewport bounds", () => {
    const { position } = setup();
    assert.deepEqual(
        [
            ...position(
                [1199, 799],
                { width: 240, height: 120 },
                { width: 1200, height: 800 }
            ),
        ],
        [956, 580]
    );
    assert.deepEqual(
        [
            ...position(
                [-20, -50],
                { width: 1800, height: 1000 },
                { width: 390, height: 400 }
            ),
        ],
        [4, 4]
    );
});
