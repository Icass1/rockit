import { StreakFlame } from "@rockit/ui/primitives/StreakFlame";
import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

it("limits native vector updates and pauses when the app is in the background", async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(
        false
    );
    let change: ((status: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation(
        (_event, listener) => {
            change = listener;
            return { remove: jest.fn() };
        }
    );
    const view = await render(<StreakFlame days={14} />);
    const contour = () =>
        JSON.stringify(view.toJSON()).match(/"d":"([^"]+)"/)?.[1];
    const still = contour();
    expect(still).toMatch(/^M50 85/);
    await act(() => jest.advanceTimersByTime(30));
    expect(contour()).toBe(still);
    await act(() => jest.advanceTimersByTime(20));
    const burning = contour();
    expect(burning).not.toBe(still);
    await act(() => change?.("background"));
    await act(() => jest.advanceTimersByTime(250));
    expect(contour()).toBe(burning);
    await view.unmount();
});
