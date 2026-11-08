// @vitest-environment jsdom
import { createAtom } from "@rockit/shared";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useActiveLyricIndex } from "../../../apps/web/hooks/useActiveLyricIndex";

afterEach(cleanup);
it("skips clock-only renders while preserving duplicate timestamps, offsets and backward seeks", () => {
    const clock = createAtom<number | null>(0);
    const lines = [
        { text: "First", timestamp_s: 0 },
        { text: "Second", timestamp_s: 10 },
        { text: "Duplicate", timestamp_s: 10 },
    ];
    let renders = 0;
    function Probe() {
        const index = useActiveLyricIndex(clock, lines, 2);
        renders++;
        return <output>{index}</output>;
    }
    const view = render(<Probe />);
    const initial = renders;
    for (let sample = 1; sample <= 60; sample++)
        act(() => clock.set(sample / 100));
    expect(renders).toBe(initial);
    act(() => clock.set(8));
    expect(screen.getByRole("status").textContent).toBe("2");
    act(() => clock.set(0));
    expect(screen.getByRole("status").textContent).toBe("0");
    act(() => clock.set(null));
    expect(screen.getByRole("status").textContent).toBe("-1");
    view.unmount();
    expect(clock.lc).toBe(0);
});
