"use client";

import type { ReactNode } from "react";
import { withAlpha } from "@rockit/theme";
import { useVinylRotation } from "@rockit/ui/headless/useVinylRotation";
import { Animated, StyleSheet, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** The desktop record proportions, composed from primitives on every mobile renderer. */
export function VinylRecord({
    cover,
    size,
    playing,
    visible = true,
    label,
}: {
    cover: ReactNode;
    size: number;
    playing: boolean;
    visible?: boolean;
    label: string;
}) {
    const { colors } = useDesignTheme();
    const rotation = useVinylRotation(playing, visible);
    const paper = colors["on-media"];
    return (
        <View
            testID="player-vinyl"
            accessibilityRole="image"
            accessibilityLabel={label}
            style={{ width: size, height: size }}
        >
            <Animated.View
                testID="player-vinyl-disc"
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    overflow: "hidden",
                    backgroundColor: colors["vinyl-body"],
                    transform: [{ rotate: rotation }],
                }}
            >
                {Array.from({ length: 18 }, (_, index) => {
                    const diameter = size * (0.7 + index * 0.017);
                    return (
                        <View
                            key={index}
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                width: diameter,
                                height: diameter,
                                top: (size - diameter) / 2,
                                left: (size - diameter) / 2,
                                borderRadius: diameter / 2,
                                borderWidth: 1,
                                borderColor: colors["vinyl-groove"],
                            }}
                        />
                    );
                })}
                <View
                    pointerEvents="none"
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                    style={{
                        position: "absolute",
                        width: (size * 2) / 3,
                        height: (size * 2) / 3,
                        top: size / 6,
                        left: size / 6,
                        borderRadius: size / 3,
                        overflow: "hidden",
                    }}
                >
                    {cover}
                </View>
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        width: (size * 2) / 3,
                        height: (size * 2) / 3,
                        top: size / 6,
                        left: size / 6,
                        borderRadius: size / 3,
                        borderWidth: 2,
                        borderColor: withAlpha(paper, 0.55),
                    }}
                />
                <View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            borderRadius: size / 2,
                            borderWidth: 1.5,
                            borderColor: withAlpha(paper, 0.12),
                        },
                    ]}
                />
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: size * 0.475,
                        left: size * 0.475,
                        width: size * 0.05,
                        height: size * 0.05,
                        borderRadius: size * 0.025,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: paper,
                    }}
                >
                    <View
                        style={{
                            width: "38%",
                            height: "38%",
                            borderRadius: size,
                            backgroundColor: colors.backdrop,
                        }}
                    />
                </View>
            </Animated.View>
        </View>
    );
}
