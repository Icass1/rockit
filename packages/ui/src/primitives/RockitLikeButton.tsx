"use client";

import { useEffect, useRef, useState } from "react";
import { designTokens } from "@rockit/theme";
import { Flame, HandMetal } from "@rockit/ui/icons";
import {
    AccessibilityInfo,
    Animated,
    nativeAnimations,
    Pressable,
} from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** One hand-and-flame presenter for desktop, PWA and native, without domain state. */
export function RockitLikeButton({
    liked,
    label,
    onPress,
    disabled = false,
}: {
    liked: boolean;
    label: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    const theme = useDesignTheme();
    const previous = useRef(liked);
    const reduced = useRef(false);
    const [tilt] = useState(() => new Animated.Value(0));
    const [flame] = useState(() => new Animated.Value(0));
    useEffect(() => {
        let active = true;
        void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
            if (active) reduced.current = value;
        });
        const subscription = AccessibilityInfo.addEventListener(
            "reduceMotionChanged",
            (value) => {
                reduced.current = value;
                if (value) {
                    tilt.stopAnimation();
                    flame.stopAnimation();
                    flame.setValue(0);
                }
            }
        );
        return () => {
            active = false;
            subscription?.remove();
        };
    }, [tilt, flame]);
    useEffect(() => {
        const changed = previous.current !== liked;
        previous.current = liked;
        if (!changed) return;
        tilt.stopAnimation();
        flame.stopAnimation();
        tilt.setValue(0);
        flame.setValue(0);
        if (reduced.current) return;
        const hand = Animated.sequence([
            Animated.timing(tilt, {
                toValue: 1,
                duration: theme.motion.fast,
                useNativeDriver: nativeAnimations,
            }),
            Animated.timing(tilt, {
                toValue: 0,
                duration: theme.motion.normal,
                useNativeDriver: nativeAnimations,
            }),
        ]);
        const fire = liked
            ? Animated.sequence([
                  Animated.timing(flame, {
                      toValue: 1,
                      duration: theme.motion.normal,
                      useNativeDriver: nativeAnimations,
                  }),
                  Animated.delay(designTokens.motion.likeHold),
                  Animated.timing(flame, {
                      toValue: 0,
                      duration: theme.motion.normal,
                      useNativeDriver: nativeAnimations,
                  }),
              ])
            : null;
        hand.start();
        fire?.start();
        return () => {
            hand.stop();
            fire?.stop();
        };
    }, [liked, tilt, flame, theme.motion.fast, theme.motion.normal]);
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: liked, disabled }}
            aria-pressed={liked}
            disabled={disabled}
            onPress={onPress}
            style={{
                width: theme.layout.touchTarget,
                height: theme.layout.touchTarget,
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
            }}
        >
            <Animated.View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: -theme.spacing.md,
                    opacity: flame,
                    transform: [
                        {
                            translateY: flame.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -theme.spacing.sm],
                            }),
                        },
                        { scale: flame },
                    ],
                }}
            >
                <Flame
                    size={theme.typography.title}
                    color={theme.colors["flame-body-hot"]}
                    fill={theme.colors["flame-core-start"]}
                />
            </Animated.View>
            <Animated.View
                style={{
                    transform: [
                        {
                            rotate: tilt.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0deg", "-18deg"],
                            }),
                        },
                    ],
                }}
            >
                <HandMetal
                    size={theme.typography.title}
                    color={
                        liked
                            ? theme.colors.primary
                            : theme.colors["muted-foreground"]
                    }
                    fill={liked ? theme.colors.primary : "none"}
                />
            </Animated.View>
        </Pressable>
    );
}
