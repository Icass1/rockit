// @vitest-environment jsdom
import { createAtom } from "@rockit/shared";
import { useActiveLyricIndex } from "@rockit/ui/headless/useActiveLyricIndex";
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
    act(() => clock.set(10.5));
    expect(states()).toEqual(["past", "active"]);
    expect(
        view.container.querySelector('[data-word-state="past"]')?.className
    ).toBe("text-foreground-strong");
    expect(
        (
            view.container.querySelector(
                '[data-word-state="active"]'
            ) as HTMLElement
        ).style.backgroundImage
    ).toContain("25%");
    act(() => clock.set(7));
    expect(states()).toEqual(["future", "future"]);
    view.rerender(<WordSyncedLine clock={clock} line={line} active={false} />);
    expect(view.container.textContent).toBe("Hello world");
    expect(clock.lc).toBe(0);
    view.unmount();
    expect(clock.lc).toBe(0);
});

it("holds every word white during a gap and only retires the line when the next one starts", () => {
    const clock = createAtom<number | null>(1.9);
    const lines = [
        {
            text: "Hola mundo",
            timestamp_s: 0,
            end_timestamp_s: 3.8,
            words: [
                { text: "Hola ", timestamp_s: 0, end_timestamp_s: 1 },
                { text: "mundo", timestamp_s: 1, end_timestamp_s: 2 },
            ],
        },
        {
            text: "Seguimos",
            timestamp_s: 2.5,
            end_timestamp_s: null,
            words: [
                { text: "Seguimos", timestamp_s: 2.5, end_timestamp_s: null },
            ],
        },
    ];
    function Lyrics() {
        const index = useActiveLyricIndex(clock, lines);
        return lines.map((line, i) => (
            <p key={line.timestamp_s} data-current={i === index}>
                <WordSyncedLine
                    clock={clock}
                    line={line}
                    active={i === index}
                    nextLineStart={lines[i + 1]?.timestamp_s}
                />
            </p>
        ));
    }
    const view = render(<Lyrics />);
    const current = () => view.container.querySelector('[data-current="true"]');
    const finished = () => [
        ...current()!.querySelectorAll(
            '[data-word-state="past"].text-foreground-strong'
        ),
    ];
    expect(finished()).toHaveLength(1);
    for (const time of [2, 2.25, 2.49]) {
        act(() => clock.set(time));
        expect(current()?.textContent).toBe("Hola mundo");
        expect(finished()).toHaveLength(2);
    }
    act(() => clock.set(2.5));
    expect(current()?.textContent).toBe("Seguimos");
    expect(view.container.firstElementChild?.textContent).toBe("Hola mundo");
});
