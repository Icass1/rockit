// PlayerControls – solid (filled) icons using Lucide

import React from "react";
import { EQueueType, ERepeatMode } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
} from "@rockit/ui/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";

function getRepeatColor(
    mode: ERepeatMode,
    accent: string,
    theme: DesignTheme
): string {
    return mode === ERepeatMode.OFF
        ? withAlpha(theme.colors["foreground-strong"], 0.5)
        : accent;
}

export default function PlayerControls() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const {
        isPlaying,
        repeatMode,
        queueType,
        togglePlayPause,
        skipForward,
        skipBack,
        toggleRandomQueue,
        cycleRepeat,
    } = usePlayer();

    // Color for the repeat icon when active/inactive
    const repeatColor = getRepeatColor(repeatMode, theme.legacy.accent, theme);

    return (
        <View style={styles.container}>
            {/* Shuffle */}
            <Pressable
                style={styles.sideButton}
                accessibilityRole="button"
                accessibilityLabel={
                    queueType === EQueueType.RANDOM
                        ? vocabulary.PLAYER_DISABLE_SHUFFLE
                        : vocabulary.PLAYER_ENABLE_SHUFFLE
                }
                onPress={toggleRandomQueue}
                hitSlop={12}
            >
                <Shuffle
                    size={24}
                    color={
                        queueType === EQueueType.RANDOM
                            ? theme.legacy.accent
                            : withAlpha(theme.colors["foreground-strong"], 1)
                    }
                />
            </Pressable>

            {/* Skip back */}
            <Pressable
                style={styles.sideButton}
                accessibilityRole="button"
                accessibilityLabel={vocabulary.PREVIOUS_MEDIA}
                onPress={skipBack}
                hitSlop={12}
            >
                <SkipBack
                    fill={theme.legacy.white}
                    size={24}
                    color={theme.legacy.white}
                />
            </Pressable>

            {/* Play / Pause – larger solid button */}
            <Pressable
                style={({ pressed }) => [
                    styles.playButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                    isPlaying ? vocabulary.PAUSE : vocabulary.PLAY
                }
                onPress={togglePlayPause}
            >
                {isPlaying ? (
                    <Pause
                        fill={theme.colors["primary-foreground"]}
                        size={34}
                        color={theme.colors["primary-foreground"]}
                    />
                ) : (
                    <Play
                        fill={theme.colors["primary-foreground"]}
                        size={34}
                        color={theme.colors["primary-foreground"]}
                    />
                )}
            </Pressable>

            {/* Skip forward */}
            <Pressable
                style={styles.sideButton}
                accessibilityRole="button"
                accessibilityLabel={vocabulary.NEXT_MEDIA}
                onPress={skipForward}
                hitSlop={12}
            >
                <SkipForward
                    fill={theme.legacy.white}
                    size={24}
                    color={theme.legacy.white}
                />
            </Pressable>

            {/* Repeat */}
            <Pressable
                style={styles.sideButton}
                accessibilityRole="button"
                accessibilityLabel={
                    repeatMode === ERepeatMode.ONE
                        ? vocabulary.REPEAT_ONE
                        : repeatMode === ERepeatMode.ALL
                          ? vocabulary.REPEAT_ALL
                          : vocabulary.NO_REPEAT
                }
                onPress={cycleRepeat}
                hitSlop={12}
            >
                <View>
                    <Repeat size={24} color={repeatColor} />
                    {repeatMode === ERepeatMode.ONE && (
                        <View style={styles.repeatOneBadge}>
                            <Text style={styles.repeatOneLabel}>1</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
            paddingHorizontal: theme.spacing.xs,
            width: "100%",
        },
        sideButton: {
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
        },
        playButton: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: "transparent",
            alignItems: "center",
            justifyContent: "center",
        },
        repeatOneBadge: {
            position: "absolute",
            bottom: -4,
            right: -2,
        },
        repeatOneLabel: {
            fontSize: 8,
            color: theme.legacy.accent,
            fontWeight: "700",
        },
    });
