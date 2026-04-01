import { COLORS } from "@/constants/theme";
import Slider from "@react-native-community/slider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

const CROSSFADE_OPTIONS_MS = [0, 2000, 4000, 6000, 8000, 10000, 12000];

function formatDuration(ms: number): string {
    if (ms === 0) return "Off";
    return `${ms / 1000}s`;
}

export default function CrossfadeSettings() {
    const { crossfadeSettings, updateCrossfadeSettings } = usePlayer();

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>Crossfade</Text>
                <Text style={styles.value}>
                    {formatDuration(crossfadeSettings.durationMs)}
                </Text>
            </View>

            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={CROSSFADE_OPTIONS_MS.length - 1}
                step={1}
                value={CROSSFADE_OPTIONS_MS.indexOf(
                    crossfadeSettings.durationMs
                )}
                onValueChange={(idx) => {
                    updateCrossfadeSettings({
                        durationMs: CROSSFADE_OPTIONS_MS[Math.round(idx)],
                    });
                }}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={COLORS.white}
            />

            <View style={styles.effectRow}>
                <Text style={styles.effectLabel}>Curve</Text>
                {(["linear", "equal_power"] as const).map((effect) => (
                    <Pressable
                        key={effect}
                        style={[
                            styles.effectButton,
                            crossfadeSettings.effect === effect &&
                                styles.effectButtonActive,
                        ]}
                        onPress={() => updateCrossfadeSettings({ effect })}
                    >
                        <Text
                            style={[
                                styles.effectButtonText,
                                crossfadeSettings.effect === effect &&
                                    styles.effectButtonTextActive,
                            ]}
                        >
                            {effect === "equal_power"
                                ? "Equal Power"
                                : "Linear"}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Text style={styles.hint}>
                {crossfadeSettings.durationMs === 0
                    ? "Songs play back-to-back with no overlap"
                    : `Songs overlap by ${crossfadeSettings.durationMs / 1000} seconds`}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 4,
        paddingVertical: 12,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    label: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.white,
    },
    value: {
        fontSize: 15,
        color: COLORS.accent,
        fontWeight: "600",
    },
    slider: {
        width: "100%",
        height: 40,
    },
    effectRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    effectLabel: {
        fontSize: 13,
        color: COLORS.gray400,
        marginRight: 4,
    },
    effectButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    effectButtonActive: {
        backgroundColor: COLORS.accent,
    },
    effectButtonText: {
        fontSize: 12,
        color: COLORS.gray400,
        fontWeight: "500",
    },
    effectButtonTextActive: {
        color: COLORS.white,
    },
    hint: {
        fontSize: 12,
        color: "rgba(255,255,255,0.35)",
        textAlign: "center",
        marginTop: 8,
    },
});
