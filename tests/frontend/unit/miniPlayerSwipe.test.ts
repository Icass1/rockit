import { expect, it } from "vitest";
import { miniPlayerSwipeDirection } from "../../../apps/mobile/lib/miniPlayerSwipe";

it("commits the release direction, allowing reversal and cancellation", () => {
    expect(miniPlayerSwipeDirection(-90, 2, -0.2, 260)).toBe(-1);
    expect(miniPlayerSwipeDirection(90, 2, 0.2, 260)).toBe(1);
    expect(miniPlayerSwipeDirection(8, 0, -1, 260)).toBe(0);
    expect(miniPlayerSwipeDirection(40, 2, 0.8, 260)).toBe(1);
    expect(miniPlayerSwipeDirection(60, 100, 1, 260)).toBe(0);
    expect(miniPlayerSwipeDirection(25, 1, 0.1, 260)).toBe(0);
});
