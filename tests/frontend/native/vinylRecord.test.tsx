import { DesignThemeProvider } from "@rockit/ui";
import { VinylRecord } from "@rockit/ui/primitives/VinylRecord";
import { act, render, screen } from "@testing-library/react-native";
import {
    AccessibilityInfo,
    Animated,
    AppState,
    NativeModules,
    Text,
    type AppStateStatus,
} from "react-native";

it("renders a native record, uses the native driver and stops its motor when hidden", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(
        false
    );
    const timing = jest.spyOn(Animated, "timing");
    const disc = (visible: boolean) => (
        <DesignThemeProvider mode="dark">
            <VinylRecord
                label="Fixture song"
                size={240}
                playing
                visible={visible}
                cover={<Text>Fixture art</Text>}
            />
        </DesignThemeProvider>
    );
    await render(disc(true));
    expect(screen.getByTestId("player-vinyl")).toHaveProp(
        "accessibilityLabel",
        "Fixture song"
    );
    expect(screen.getByTestId("player-vinyl-disc")).toHaveStyle({
        width: 240,
        height: 240,
        borderRadius: 120,
    });
    expect(timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ useNativeDriver: true, isInteraction: false })
    );
    timing.mockClear();
    await screen.rerender(disc(false));
    expect(timing).not.toHaveBeenCalled();
    await screen.unmount();
    jest.restoreAllMocks();
});
it("honors reduced motion and listens for live accessibility and background changes", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(
        true
    );
    // The preset's native bridge does not answer getValue. Simulate its response
    // so pause/background/resume can capture the stopped native transform.
    NativeModules.NativeAnimatedModule.getValue.mockImplementation(
        (_tag: number, callback: (value: number) => void) => callback(0)
    );
    const motions = new Set<(value: boolean) => void>();
    const states = new Set<(value: AppStateStatus) => void>();
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
        _event: string,
        listener: (value: boolean) => void
    ) => {
        motions.add(listener);
        return {
            remove: () => {
                motions.delete(listener);
            },
        };
    }) as unknown as typeof AccessibilityInfo.addEventListener);
    jest.spyOn(AppState, "addEventListener").mockImplementation(
        (_event, listener) => {
            const stateListener = listener as (value: AppStateStatus) => void;
            states.add(stateListener);
            return {
                remove: () => {
                    states.delete(stateListener);
                },
            };
        }
    );
    const emitMotion = (value: boolean) =>
        Array.from(motions).forEach((listener) => listener(value));
    const emitState = (state: AppStateStatus) =>
        Array.from(states).forEach((listener) => listener(state));
    const timing = jest.spyOn(Animated, "timing");
    await render(
        <VinylRecord
            label="Fixture song"
            size={200}
            playing
            cover={<Text>Art</Text>}
        />
    );
    expect(timing).not.toHaveBeenCalled();
    await act(() => emitMotion(false));
    expect(timing).toHaveBeenCalled();
    timing.mockClear();
    await act(() => emitState("background"));
    expect(timing).not.toHaveBeenCalled();
    await act(() => emitState("active"));
    expect(timing).toHaveBeenCalled();
    await screen.unmount();
    timing.mockClear();
    await act(() => {
        emitMotion(true);
        emitState("background");
        emitState("active");
    });
    expect(timing).not.toHaveBeenCalled();
    jest.restoreAllMocks();
});
