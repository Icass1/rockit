"use client";

import { useEffect, useRef, useState } from "react";
import { designTokens, withAlpha } from "@rockit/theme";
import { useMotionEnvironment } from "@rockit/ui/headless/useMotionEnvironment";
import { HandMetal, RockitFire, RockitHandSolid } from "@rockit/ui/icons";
import {
    Animated,
    Easing,
    nativeAnimations,
    Pressable,
    View,
} from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** A solid white RockIt hand with a finite, layered fire burst on a confirmed like. */
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
    const motion = useMotionEnvironment();
    const [tilt] = useState(() => new Animated.Value(0));
    const [hop] = useState(() => new Animated.Value(0));
    const handSize = 28;
    const artworkScale = handSize / 26;
    const [flame] = useState(() => new Animated.Value(0));
    const [flicker] = useState(() => new Animated.Value(0));
    useEffect(() => {
        const changed = previous.current !== liked;
        previous.current = liked;
        tilt.stopAnimation();
        hop.stopAnimation();
        flame.stopAnimation();
        flicker.stopAnimation();
        tilt.setValue(0);
        hop.setValue(0);
        flame.setValue(0);
        flicker.setValue(0);
        if (!changed || !motion) return;
        const timing = (
            value: typeof tilt,
            toValue: number,
            duration: number
        ) =>
            Animated.timing(value, {
                toValue,
                duration,
                useNativeDriver: nativeAnimations,
                isInteraction: false,
                easing: Easing.inOut(Easing.sin),
            });
        const hand = liked
            ? Animated.sequence(
                  Array.from({ length: 3 }, () => [
                      timing(hop, 1, 250),
                      timing(hop, 0, 250),
                  ]).flat()
              )
            : Animated.sequence([
                  timing(tilt, 1, 87.5),
                  timing(tilt, -1, 175),
                  timing(tilt, 1, 175),
                  timing(tilt, -0.5, 175),
                  timing(tilt, 0, 87.5),
              ]);
        const shimmer = Animated.loop(
            Animated.timing(flicker, {
                toValue: 1,
                duration: 180,
                easing: Easing.linear,
                useNativeDriver: nativeAnimations,
                isInteraction: false,
            })
        );
        const fire = liked
            ? Animated.sequence([
                  timing(flame, 1, theme.motion.normal),
                  Animated.delay(designTokens.motion.likeHold),
                  timing(flame, 0, theme.motion.normal),
              ])
            : null;
        let active = true;
        hand.start();
        if (fire) {
            shimmer.start();
            fire.start(() => {
                if (active) shimmer.stop();
            });
        }
        return () => {
            active = false;
            hand.stop();
            fire?.stop();
            shimmer.stop();
            tilt.stopAnimation();
            hop.stopAnimation();
            flame.stopAnimation();
            flicker.stopAnimation();
        };
    }, [liked, motion, tilt, hop, flame, flicker, theme.motion.normal]);
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
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Animated.View
                testID="rockit-like-fire"
                pointerEvents="none"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                    position: "absolute",
                    width: 60,
                    height: 68,
                    left: (theme.layout.touchTarget - 60) / 2,
                    top: theme.layout.touchTarget / 2 + 14 * artworkScale - 68,
                    opacity: flame,
                    transform: [
                        { translateY: 34 },
                        { scaleX: 0.66 * artworkScale },
                        { scaleY: 0.88 * artworkScale },
                        {
                            scale: flame.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1],
                            }),
                        },
                        { translateY: -34 },
                    ],
                }}
            >
                <View
                    style={{
                        position: "absolute",
                        bottom: 1,
                        left: 6,
                        width: 48,
                        height: 44,
                        borderRadius: 24,
                        backgroundColor: withAlpha(
                            theme.colors["flame-glow"],
                            0.2
                        ),
                        shadowColor: theme.colors["flame-glow"],
                        shadowOpacity: 0.8,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                    }}
                />
                <Animated.View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        transform: [
                            {
                                scaleY: flicker.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0.94, 1.05, 0.94],
                                }),
                            },
                            {
                                rotate: flicker.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: ["-3deg", "3deg", "-3deg"],
                                }),
                            },
                        ],
                    }}
                >
                    <RockitFire
                        size={60}
                        strokeWidth={0}
                        fill={theme.colors["flame-base-hot"]}
                    />
                </Animated.View>
                <Animated.View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 7,
                        transform: [
                            {
                                scaleX: flicker.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [1.04, 0.93, 1.04],
                                }),
                            },
                            {
                                scaleY: flicker.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [1.07, 0.95, 1.07],
                                }),
                            },
                        ],
                    }}
                >
                    <RockitFire
                        size={46}
                        strokeWidth={0}
                        fill={theme.colors["flame-body-hot"]}
                    />
                </Animated.View>
                <View style={{ position: "absolute", bottom: 1, left: 15 }}>
                    <RockitFire
                        size={30}
                        strokeWidth={0}
                        fill={theme.colors["flame-core-end"]}
                    />
                </View>
                {[9, 29, 47].map((left, index) => (
                    <Animated.View
                        key={left}
                        style={{
                            position: "absolute",
                            bottom: 30 + index * 4,
                            left,
                            width: 2.5,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.colors["flame-core-start"],
                            opacity: flicker.interpolate({
                                inputRange: [0, 0.25, 0.8, 1],
                                outputRange: [0, 1, 0.4, 0],
                            }),
                            transform: [
                                {
                                    translateY: flicker.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -18 - index * 3],
                                    }),
                                },
                                {
                                    translateX: flicker.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, index === 1 ? 2 : -3],
                                    }),
                                },
                            ],
                        }}
                    />
                ))}
            </Animated.View>
            <Animated.View
                testID="rockit-like-hand"
                pointerEvents="none"
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [
                        {
                            translateY: hop.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -handSize * 0.07],
                            }),
                        },
                        {
                            translateX: tilt.interpolate({
                                inputRange: [-1, 0, 1],
                                outputRange: [
                                    -handSize * 0.05,
                                    0,
                                    handSize * 0.05,
                                ],
                            }),
                        },
                        {
                            rotate: tilt.interpolate({
                                inputRange: [-1, 0, 1],
                                outputRange: ["-5.16deg", "0deg", "5.16deg"],
                            }),
                        },
                    ],
                }}
            >
                {liked ? (
                    <RockitHandSolid
                        size={handSize}
                        strokeWidth={2}
                        color={theme.colors.backdrop}
                        fill={theme.colors["on-media"]}
                    />
                ) : (
                    <HandMetal
                        size={handSize}
                        color={theme.colors["muted-foreground"]}
                        fill="none"
                    />
                )}
            </Animated.View>
        </Pressable>
    );
}
