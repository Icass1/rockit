// @vitest-environment jsdom
import { createAtom } from "@rockit/shared";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { WordSyncedLine } from "../../../apps/web/components/Lyrics/WordSyncedLine";

afterEach(cleanup);

it("highlights words on playback and seeking, preserving whitespace and releasing its subscription", () => {
    const clock = createAtom<number | null>(0);
    const line = {
        text: "Hello world",
        timestamp_s: 10,
        end_timestamp_s: 14,
        words: [
            { text: "Hello ", timestamp_s: 10, end_timestamp_s: 11 },
            { text: "world", timestamp_s: 12, end_timestamp_s: null },
        ],
    };
    const view = render(
        <WordSyncedLine clock={clock} line={line} active offset={2} />
    );
    const states = () =>
        [...view.container.querySelectorAll("span")].map((el) =>
            el.getAttribute("data-word-state")
        );
    expect(view.container.textContent).toBe("Hello world");
    expect(states()).toEqual(["future", "future"]);
    act(() => clock.set(8));
    expect(states()).toEqual(["active", "future"]);
    act(() => clock.set(9));
    expect(states()).toEqual(["past", "future"]);
    act(() => clock.set(10));
    expect(states()).toEqual(["past", "active"]);
    act(() => clock.set(7));
    expect(states()).toEqual(["future", "future"]);
    view.rerender(<WordSyncedLine clock={clock} line={line} active={false} />);
    expect(view.container.textContent).toBe("Hello world");
    expect(clock.lc).toBe(0);
    view.unmount();
    expect(clock.lc).toBe(0);
});
