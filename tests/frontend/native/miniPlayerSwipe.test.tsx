import { useMiniPlayerSwipe } from "@mobile/hooks/useMiniPlayerSwipe";
import { act, renderHook } from "@testing-library/react-native";
import {
    Animated,
    PanResponder,
    type GestureResponderEvent,
    type PanResponderCallbacks,
    type PanResponderGestureState,
} from "react-native";

jest.mock("react-native-reanimated", () => ({ useReducedMotion: () => true }), {
    virtual: true,
});

it("waits for release, cancels a return to center and commits only the final direction", async () => {
    let handlers: PanResponderCallbacks = {};
    jest.spyOn(PanResponder, "create").mockImplementation((value) => {
        handlers = value;
        return { panHandlers: {} };
    });
    jest.spyOn(Animated, "timing").mockImplementation(() => ({
        start: (callback) => callback?.({ finished: true }),
        stop: jest.fn(),
        reset: jest.fn(),
    }));
    const next = jest.fn(async () => {}),
        previous = jest.fn(async () => {});
    const { unmount } = await renderHook(() =>
        useMiniPlayerSwipe({
            publicId: "song",
            disabled: false,
            next,
            previous,
        })
    );
    const event = {} as GestureResponderEvent;
    const gesture = (dx: number) =>
        ({
            dx,
            dy: 0,
            vx: 0,
            numberActiveTouches: 1,
        }) as PanResponderGestureState;
    await act(() => {
        handlers.onPanResponderGrant?.(event, gesture(0));
        handlers.onPanResponderMove?.(event, gesture(-120));
    });
    expect(next).not.toHaveBeenCalled();
    await act(() => handlers.onPanResponderRelease?.(event, gesture(5)));
    expect(next).not.toHaveBeenCalled();
    await act(() => {
        handlers.onPanResponderGrant?.(event, gesture(0));
        handlers.onPanResponderMove?.(event, gesture(-120));
        handlers.onPanResponderMove?.(event, gesture(100));
        handlers.onPanResponderRelease?.(event, gesture(100));
    });
    expect(previous).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    await unmount();
});
