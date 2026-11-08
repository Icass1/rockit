// @vitest-environment jsdom
import { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLyricAutoScroll } from "../../../apps/web/hooks/useLyricAutoScroll";

const frames = new Map<number, FrameRequestCallback>();
let reduced = false;
let next = 0;
beforeEach(() => {
    reduced = false;
    next = 0;
    frames.clear();
    vi.stubGlobal("matchMedia", () => ({
        matches: reduced,
        addEventListener() {},
        removeEventListener() {},
    }));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.set(++next, callback);
        return next;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            disconnect() {}
        }
    );
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});
function Probe({ active = true }: { active?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useLyricAutoScroll(ref, active ? "[data-line]" : null);
    return (
        <div
            data-testid="scroll"
            ref={(element) => {
                ref.current = element;
                if (element) {
                    Object.defineProperties(element, {
                        scrollHeight: { value: 1000, configurable: true },
                        clientHeight: { value: 100, configurable: true },
                    });
                    Object.defineProperties(element.firstElementChild!, {
                        offsetTop: { value: 300, configurable: true },
                        offsetHeight: { value: 100, configurable: true },
                    });
                }
            }}
        >
            <p data-line>Fixture lyric</p>
        </div>
    );
}
it("keeps scroll clocks independent and cancels only the view being changed", () => {
    const first = render(<Probe />),
        second = render(<Probe />);
    expect(frames.size).toBe(2);
    first.rerender(<Probe active={false} />);
    expect(frames.size).toBe(1);
    second.unmount();
    expect(frames.size).toBe(0);
});
it("centers immediately without scheduling animation for reduced motion", () => {
    reduced = true;
    const view = render(<Probe />);
    expect(view.getByTestId("scroll").scrollTop).toBe(300);
    expect(frames.size).toBe(0);
});
