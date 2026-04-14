import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import Slider from "@react-native-community/slider";
import { UpdateCrossfadeRequestSchema } from "@rockit/shared";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { apiPatchNoResponse } from "@/lib/api";
import { usePlayer } from "@/lib/PlayerContext";

/**
 * Crossfade settings UI used inside the Settings page.
 * - Continuous slider (0‑40 s) that updates PlayerContext instantly.
 * - Persists the value to the backend when sliding stops.
 * - Allows selecting the cross‑fade curve (linear, equal_power, instant).
 */
export default function CrossfadeSettings() {
    const { crossfadeSettings, updateCrossfadeSettings } = usePlayer();
    const [durationSec, setDurationSec] = useState(
        crossfadeSettings.durationMs / 1000
    );
    const [isSaving, setIsSaving] = useState(false);

    // Keep local duration in sync if context updates elsewhere (e.g., from another screen)
    useEffect(() => {
        setDurationSec(crossfadeSettings.durationMs / 1000);
    }, [crossfadeSettings.durationMs]);

    const handleSliderChange = (value: number) => {
        setDurationSec(value);
        // Update the PlayerContext immediately (store ms)
        updateCrossfadeSettings({ durationMs: Math.round(value * 1000) });
    };

    const handleSliderComplete = async (value: number) => {
        const seconds = Math.round(value);
        setIsSaving(true);
        try {
            await apiPatchNoResponse(
                "/user/crossfade",
                UpdateCrossfadeRequestSchema,
                { crossfade: seconds }
            );
        } catch {
            Alert.alert("Error", "Failed to save crossfade");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEffectPress = (effect: typeof crossfadeSettings.effect) => {
        updateCrossfadeSettings({ effect });
    };

    return (
        <View>
            {/* Slider for duration */}
            <View style={styles.sliderContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={40}
                    step={1}
                    value={durationSec}
                    onValueChange={handleSliderChange}
                    onSlidingComplete={handleSliderComplete}
                    minimumTrackTintColor={COLORS.accent}
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor={COLORS.white}
                />
                <Text style={styles.suffix}>{durationSec}s</Text>
            </View>

            {/* Curve selector */}
            <View style={styles.effectRow}>
                {(["linear", "equal_power", "instant"] as const).map((eff) => (
                    <Pressable
                        key={eff}
                        style={[
                            styles.effectButton,
                            crossfadeSettings.effect === eff &&
                                styles.effectButtonActive,
                        ]}
                        onPress={() => handleEffectPress(eff)}
                    >
                        <Text
                            style={[
                                styles.effectButtonText,
                                crossfadeSettings.effect === eff &&
                                    styles.effectButtonTextActive,
                            ]}
                        >
                            {eff === "equal_power"
                                ? "Equal Power"
                                : eff.charAt(0).toUpperCase() + eff.slice(1)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {isSaving && <Text style={styles.saving}>Saving...</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    sliderContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    suffix: {
        color: COLORS.gray600,
        fontSize: 14,
    },
    effectRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
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
    saving: {
        color: COLORS.accent,
        fontSize: 12,
        marginTop: 8,
    },
});
