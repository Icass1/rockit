import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { ERepeatMode } from "@rockit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

function getRepeatColor(mode: ERepeatMode, accent: string): string {
    return mode === ERepeatMode.OFF ? "rgba(255,255,255,0.5)" : accent;
}

export default function PlayerControls() {
    const {
        isPlaying,
        shuffle,
        repeatMode,
        togglePlayPause,
        skipForward,
        skipBack,
        toggleShuffle,
        cycleRepeat,
    } = usePlayer();

    return (
        <View style={styles.container}>
            {/* Shuffle */}
            <Pressable
                style={styles.sideButton}
                onPress={toggleShuffle}
                hitSlop={12}
            >
                <Feather
                    name="shuffle"
                    size={22}
                    color={
                        shuffle ? COLORS.accent : "rgba(255,255,255,0.5)"
                    }
                />
            </Pressable>

            {/* Skip back */}
            <Pressable
                style={styles.sideButton}
                onPress={skipBack}
                hitSlop={12}
            >
                <Feather
                    name="skip-back"
                    size={30}
                    color={COLORS.white}
                    // Filled look to match old MobilePlayerUI fill-current
                    style={styles.filledIcon}
                />
            </Pressable>

            {/* Play / Pause — large circle, mirrors old MobilePlayerUI */}
            <Pressable
                style={({ pressed }) => [
                    styles.playButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                onPress={togglePlayPause}
            >
                <Feather
                    name={isPlaying ? "pause" : "play"}
                    size={34}
                    color={COLORS.white}
                    style={!isPlaying ? { marginLeft: 3 } : undefined}
                />
            </Pressable>

            {/* Skip forward */}
            <Pressable
                style={styles.sideButton}
                onPress={skipForward}
                hitSlop={12}
            >
                <Feather
                    name="skip-forward"
                    size={30}
                    color={COLORS.white}
                    style={styles.filledIcon}
                />
            </Pressable>

            {/* Repeat */}
            <Pressable
                style={styles.sideButton}
                onPress={cycleRepeat}
                hitSlop={12}
            >
                <View>
                    <Feather
                        name="repeat"
                        size={22}
                        color={getRepeatColor(repeatMode, COLORS.accent)}
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
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    // Simulates fill-current from the old web player
    filledIcon: {
        opacity: 1,
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.15)",
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
