import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { ERepeatMode } from "@rockit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

function getRepeatColor(mode: ERepeatMode, accent: string): string {
    if (mode === ERepeatMode.OFF) return "rgba(255,255,255,0.5)";
    return accent;
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
            <Pressable
                style={styles.sideButton}
                onPress={toggleShuffle}
                hitSlop={12}
            >
                <Feather
                    name="shuffle"
                    size={22}
                    color={shuffle ? COLORS.accent : "rgba(255,255,255,0.5)"}
                />
            </Pressable>

            <Pressable
                style={styles.sideButton}
                onPress={skipBack}
                hitSlop={12}
            >
                <Feather name="skip-back" size={30} color={COLORS.white} />
            </Pressable>

            <Pressable
                style={({ pressed }) => [
                    styles.playButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                onPress={togglePlayPause}
            >
                <Feather
                    name={isPlaying ? "pause" : "play"}
                    size={32}
                    color={COLORS.white}
                    style={!isPlaying ? { marginLeft: 3 } : undefined}
                />
            </Pressable>

            <Pressable
                style={styles.sideButton}
                onPress={skipForward}
                hitSlop={12}
            >
                <Feather name="skip-forward" size={30} color={COLORS.white} />
            </Pressable>

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
                            <Text
                                style={{
                                    fontSize: 8,
                                    color: COLORS.accent,
                                    fontWeight: "700",
                                }}
                            >
                                1
                            </Text>
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
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    playButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    repeatOneBadge: {
        position: "absolute",
        bottom: -4,
        right: -2,
    },
});
