"use client";

import { useEffect, useState } from "react";
import { streakFlameLevel } from "@rockit/ui/headless/streakArtwork";
import { useMotionEnvironment } from "@rockit/ui/headless/useMotionEnvironment";
import {
    StreakFlameBlaze,
    StreakFlameBright,
    StreakFlameGrowing,
    StreakFlameSeed,
} from "@rockit/ui/icons";
import { Animated, Easing, nativeAnimations, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** One small GPU-animated flame; foreground and accessibility preferences bound its lifetime. */
export function StreakFlame({
    days,
    size = 28,
}: {
    days: number;
    size?: number;
}) {
    const theme = useDesignTheme();
    const motion = useMotionEnvironment(days > 0);
    const [sway] = useState(() => new Animated.Value(0));
    const [core] = useState(() => new Animated.Value(0));
    const level = streakFlameLevel(days);
    const Icon = [
        StreakFlameSeed,
        StreakFlameGrowing,
        StreakFlameBright,
        StreakFlameBlaze,
    ][level];
    const heat = Math.min(1, Math.max(0, (days - 1) / 29));
    useEffect(() => {
        sway.setValue(0);
        core.setValue(0);
        if (!motion) return;
        const pulse = (value: typeof sway, duration: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(value, {
                        toValue: 1,
                        duration,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: nativeAnimations,
                        isInteraction: false,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: duration * 0.8,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: nativeAnimations,
                        isInteraction: false,
                    }),
                ])
            );
        const outer = pulse(sway, 620 - level * 90);
        const inner = pulse(core, 380 - level * 45);
        outer.start();
        inner.start();
        return () => {
            outer.stop();
            inner.stop();
        };
    }, [motion, level, sway, core]);
    const color = flameColor(
        theme.colors["flame-body-cold"],
        theme.colors["flame-body-hot"],
        heat
    );
    return (
        <View
            accessible={false}
            style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Animated.View
                style={{
                    position: "absolute",
                    transform: [
                        { translateY: size * 0.04 },
                        {
                            rotate: sway.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["-3deg", "3deg"],
                            }),
                        },
                        {
                            scaleX: sway.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.94, 1.04],
                            }),
                        },
                        {
                            scaleY: sway.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.96, 1.05],
                            }),
                        },
                    ],
                }}
            >
                <Icon
                    size={size}
                    color={color}
                    fill={color}
                    strokeWidth={0.5}
                />
            </Animated.View>
            <Animated.View
                style={{
                    position: "absolute",
                    bottom: size * 0.02,
                    opacity: core.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                    }),
                    transform: [
                        {
                            scaleX: core.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1.1],
                            }),
                        },
                        {
                            scaleY: core.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1.16],
                            }),
                        },
                    ],
                }}
            >
                <Icon
                    size={size * 0.48}
                    color={theme.colors["flame-core-start"]}
                    fill={theme.colors["flame-core-end"]}
                    strokeWidth={0}
                />
            </Animated.View>
        </View>
    );
}

/** Theme flame endpoints use HSL, so every additional day warms the same palette. */
function flameColor(cold: string, hot: string, heat: number): string {
    const channels = (color: string) => color.match(/[\d.]+/g)?.map(Number);
    const start = channels(cold),
        end = channels(hot);
    if (!start || !end || start.length !== 3 || end.length !== 3)
        return heat < 0.5 ? cold : hot;
    const mix = (index: number) =>
        start[index] + (end[index] - start[index]) * heat;
    return `hsl(${mix(0)}, ${mix(1)}%, ${mix(2)}%)`;
}
