"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMotionEnvironment } from "@rockit/ui/headless/useMotionEnvironment";
import { Animated, Easing, nativeAnimations } from "@rockit/ui/runtime";

/** One transform clock, with native-driven motion and no playback side effects. */
export function useVinylRotation(playing: boolean, visible: boolean) {
    const turns = useRef(new Animated.Value(0)).current;
    const offset = useRef(new Animated.Value(0)).current;
    const phase = useRef(0);
    const started = useRef<number | null>(null);
    const enabled = useMotionEnvironment(visible);
    useEffect(() => {
        let live = true;
        let animation: ReturnType<typeof Animated.timing> | undefined;
        turns.stopAnimation((value) => {
            if (!live) return;
            phase.current = (((phase.current + value) % 1) + 1) % 1;
            offset.setValue(phase.current);
            turns.setValue(0);
            if (!enabled) {
                started.current = null;
                return;
            }
            if (playing) {
                started.current = Date.now();
                animation = Animated.timing(turns, {
                    toValue: 0.125,
                    duration: 2000,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: nativeAnimations,
                    isInteraction: false,
                });
                animation.start(({ finished }) => {
                    if (!live || !finished) return;
                    // A separate phase makes every 0→1 loop a complete turn,
                    // preserving the angle after the motor ramp and on resume.
                    phase.current = (phase.current + 0.125) % 1;
                    offset.setValue(phase.current);
                    turns.setValue(0);
                    animation = Animated.loop(
                        Animated.timing(turns, {
                            toValue: 1,
                            duration: 8000,
                            easing: Easing.linear,
                            useNativeDriver: nativeAnimations,
                            isInteraction: false,
                        })
                    );
                    animation.start();
                });
                return;
            } else if (started.current !== null) {
                const speed = Math.min(
                    1,
                    (Date.now() - started.current) / 2000
                );
                started.current = null;
                animation = Animated.timing(turns, {
                    toValue: 0.1125 * speed * speed,
                    duration: Math.round(1800 * speed),
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: nativeAnimations,
                    isInteraction: false,
                });
            }
            animation?.start();
        });
        return () => {
            live = false;
            animation?.stop();
            turns.stopAnimation();
        };
    }, [turns, offset, playing, enabled]);
    return useMemo(
        () =>
            Animated.add(offset, turns).interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
            }),
        [offset, turns]
    );
}
