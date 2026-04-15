// PlayerControls – solid (filled) icons using MaterialCommunityIcons

import React from "react";
import { COLORS } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ERepeatMode } from "@rockit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

function getRepeatColor(mode: ERepeatMode, accent: string): string {
    return mode === ERepeatMode.OFF ? "rgba(255,255,255,0.5)" : accent;
}

export default function PlayerControls() {
    const {
        isPlaying,
        repeatMode,
        togglePlayPause,
        skipForward,
        skipBack,
        toggleShuffle,
        cycleRepeat,
    } = usePlayer();

    // Color for the repeat icon when active/inactive
    const repeatColor = getRepeatColor(repeatMode, COLORS.accent);

    return (
        <View style={styles.container}>
            {/* Shuffle */}
            <Pressable
                style={styles.sideButton}
                onPress={toggleShuffle}
                hitSlop={12}
            >
                <MaterialCommunityIcons
                    name="shuffle"
                    size={30}
                    color={COLORS.white}
                />
            </Pressable>

            {/* Skip back */}
            <Pressable
                style={styles.sideButton}
                onPress={skipBack}
                hitSlop={12}
            >
                <MaterialCommunityIcons
                    name="skip-previous"
                    size={30}
                    color={COLORS.white}
                />
            </Pressable>

            {/* Play / Pause – larger solid button */}
            <Pressable
                style={({ pressed }) => [
                    styles.playButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                onPress={togglePlayPause}
            >
                <MaterialCommunityIcons
                    name={isPlaying ? "pause" : "play"}
                    size={44}
                    color={COLORS.white}
                />
            </Pressable>

            {/* Skip forward */}
            <Pressable
                style={styles.sideButton}
                onPress={skipForward}
                hitSlop={12}
            >
                <MaterialCommunityIcons
                    name="skip-next"
                    size={30}
                    color={COLORS.white}
                />
            </Pressable>

            {/* Repeat */}
            <Pressable
                style={styles.sideButton}
                onPress={cycleRepeat}
                hitSlop={12}
            >
                <View>
                    <MaterialCommunityIcons
                        name="repeat"
                        size={30}
                        color={repeatColor}
                    />
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

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        width: "100%",
    },
    sideButton: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
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
        color: COLORS.accent,
        fontWeight: "700",
    },
});
