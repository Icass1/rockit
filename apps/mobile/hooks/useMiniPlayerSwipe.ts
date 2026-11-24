import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    Platform,
    type LayoutChangeEvent,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { miniPlayerSwipeDirection } from "@/lib/miniPlayerSwipe";

export function useMiniPlayerSwipe({
    publicId,
    disabled,
    next,
    previous,
}: {
    publicId?: string;
    disabled: boolean;
    next: () => Promise<void>;
    previous: () => Promise<void>;
}) {
    const [x] = useState(() => new Animated.Value(0));
    const latest = useRef({ publicId, disabled, next, previous });
    const previousId = useRef(publicId);
    const width = useRef(260);
    const origin = useRef<string | undefined>(undefined);
    const dragged = useRef(false);
    const committing = useRef(false);
    const cancelled = useRef(false);
    const waiting = useRef<-1 | 1 | 0>(0);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reduced = useReducedMotion();
    const restore = useCallback(() => {
        clearTimeout(timer.current);
        waiting.current = 0;
        x.stopAnimation();
        Animated.timing(x, {
            toValue: 0,
            duration: reduced ? 0 : 160,
            useNativeDriver: Platform.OS !== "web",
        }).start(() => {
            committing.current = false;
        });
    }, [reduced, x]);
    useEffect(() => {
        latest.current = { publicId, disabled, next, previous };
        if (previousId.current !== publicId) {
            previousId.current = publicId;
            clearTimeout(timer.current);
            x.stopAnimation();
            const direction = waiting.current;
            waiting.current = 0;
            x.setValue(direction && !reduced ? -direction * width.current : 0);
            Animated.timing(x, {
                toValue: 0,
                duration: reduced ? 0 : 180,
                useNativeDriver: Platform.OS !== "web",
            }).start(() => {
                committing.current = false;
            });
        }
    }, [publicId, disabled, next, previous, reduced, x]);
    useEffect(
        () => () => {
            clearTimeout(timer.current);
            x.stopAnimation();
        },
        [x]
    );
    const responder = useMemo(
        () =>
            // PanResponder stores these callbacks; it does not invoke them during render.
            // eslint-disable-next-line react-hooks/refs
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, g) =>
                    !latest.current.disabled &&
                    !committing.current &&
                    g.numberActiveTouches === 1 &&
                    Math.abs(g.dx) > 9 &&
                    Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
                onPanResponderGrant: () => {
                    x.stopAnimation();
                    origin.current = latest.current.publicId;
                    dragged.current = true;
                    cancelled.current = false;
                },
                onPanResponderMove: (_, g) => {
                    if (g.numberActiveTouches !== 1) {
                        cancelled.current = true;
                        restore();
                        return;
                    }
                    if (!cancelled.current)
                        x.setValue(
                            Math.max(
                                -width.current,
                                Math.min(width.current, g.dx)
                            )
                        );
                },
                onPanResponderRelease: (_, g) => {
                    if (
                        cancelled.current ||
                        latest.current.disabled ||
                        origin.current !== latest.current.publicId
                    ) {
                        restore();
                        return;
                    }
                    const direction = miniPlayerSwipeDirection(
                        g.dx,
                        g.dy,
                        g.vx,
                        width.current
                    );
                    if (!direction) {
                        restore();
                        return;
                    }
                    committing.current = true;
                    waiting.current = direction;
                    Animated.timing(x, {
                        toValue: direction * width.current,
                        duration: reduced ? 0 : 130,
                        useNativeDriver: Platform.OS !== "web",
                    }).start(({ finished }) => {
                        if (
                            !finished ||
                            origin.current !== latest.current.publicId
                        ) {
                            restore();
                            return;
                        }
                        timer.current = setTimeout(restore, 800);
                        void (
                            direction < 0
                                ? latest.current.next()
                                : latest.current.previous()
                        ).catch(restore);
                    });
                },
                onPanResponderTerminate: restore,
                onPanResponderTerminationRequest: () => !committing.current,
            }),
        [reduced, restore, x]
    );
    return {
        x,
        panHandlers: responder.panHandlers,
        onLayout: ({ nativeEvent }: LayoutChangeEvent) => {
            width.current = nativeEvent.layout.width;
        },
        beginPress: () => {
            if (!committing.current) dragged.current = false;
        },
        openOnTap: (open: () => void) => {
            if (!dragged.current && !committing.current) open();
        },
    };
}
