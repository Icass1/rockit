import { useState } from "react";
import Slider from "@react-native-community/slider";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { usePlayer } from "@/lib/PlayerContext";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

/** Browser transitions use the shared transport; unsupported native controls are hidden. */
export default function CrossfadeSettings() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const { crossfadeSettings, updateCrossfadeSettings } = usePlayer();
    const durationSec = crossfadeSettings.durationMs / 1000;
    const [isSaving, setIsSaving] = useState(false);

    const handleSliderChange = (value: number) => {
        // Update the PlayerContext immediately (store ms)
        updateCrossfadeSettings({ durationMs: Math.round(value * 1000) });
    };

    const handleSliderComplete = async (value: number) => {
        const seconds = Math.round(value);
        setIsSaving(true);
        const response = await Http.updateCrossfade({ crossfade: seconds });

        if (!response.isOk()) {
            toasterManager.notifyError(vocabulary.MOBILE_TRANSITIONS_ERROR);
        }
        setIsSaving(false);
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
                    minimumTrackTintColor={theme.legacy.accent}
                    maximumTrackTintColor={withAlpha(
                        theme.colors["foreground-strong"],
                        0.2
                    )}
                    thumbTintColor={theme.legacy.white}
                />
                <Text style={styles.suffix}>{durationSec}s</Text>
            </View>

            {isSaving && <Text style={styles.saving}>{vocabulary.SAVING}</Text>}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        sliderContainer: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        slider: {
            flex: 1,
            height: 40,
        },
        suffix: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.body,
        },
        effectRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
        },
        effectButton: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: withAlpha(theme.colors["foreground-strong"], 0.08),
        },
        effectButtonActive: {
            backgroundColor: theme.legacy.accent,
        },
        effectButtonText: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
            fontWeight: "500",
        },
        effectButtonTextActive: {
            color: theme.legacy.white,
        },
        saving: {
            color: theme.legacy.accent,
            fontSize: theme.typography.caption,
            marginTop: theme.spacing.sm,
        },
    });
