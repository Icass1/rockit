// @vitest-environment jsdom
import { createAtom } from "@rockit/shared";
import { useActiveLyricIndex } from "@rockit/ui/headless/useActiveLyricIndex";
import { useLyricPlaybackClock } from "@rockit/ui/headless/useLyricPlaybackClock";
import {
    act,
    cleanup,
    render,
    renderHook,
    screen,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

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

it("reads between status events while playing and cancels frames on pause and unmount", () => {
    const currentTime = createAtom(3);
    const playing = createAtom(false);
    let playhead = 3;
    const player = {
        currentTimeAtom: currentTime,
        playingAtom: playing,
        readPlaybackTimeForDisplay: () => playhead,
    };
    let pending: ((time: number) => void) | undefined;
    const getScheduler = () => ({
        requestAnimationFrame(tick: (time: number) => void) {
            pending = tick;
            return 1;
        },
        cancelAnimationFrame() {
            pending = undefined;
        },
    });
    const { result, unmount } = renderHook(() =>
        useLyricPlaybackClock(player, true, getScheduler)
    );
    expect(result.current.get()).toBe(3);
    expect(pending).toBeUndefined();
    act(() => playing.set(true));
    playhead = 3.016;
    act(() => pending?.(16));
    expect(result.current.get()).toBe(3.016);
    expect(currentTime.get()).toBe(3);
    playhead = 3.032;
    act(() => playing.set(false));
    expect(result.current.get()).toBe(3.032);
    expect(pending).toBeUndefined();
    playhead = 1.4;
    act(() => currentTime.set(1.4));
    expect(result.current.get()).toBe(1.4);
    act(() => playing.set(true));
    unmount();
    expect(pending).toBeUndefined();
    expect(currentTime.lc).toBe(0);
    expect(playing.lc).toBe(0);
});
