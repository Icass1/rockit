import { useCallback, useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { UpdateCrossfadeRequestSchema } from "@rockit/shared";
import { Alert, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { apiPatchNoResponse } from "@/lib/api";
import { AudioIntegrationService } from "@/lib/audio/AudioIntegration";

export default function AudioSection() {
    const [crossfade, setCrossfade] = useState("0");
    const [isSaving, setIsSaving] = useState(false);
    const [autoPlayBluetooth, setAutoPlayBluetooth] = useState(true);
    const [autoPlayHeadset, setAutoPlayHeadset] = useState(true);

    useEffect(() => {
        const config = AudioIntegrationService.getConfig();
        setAutoPlayBluetooth(config.autoPlayOnBluetoothConnect);
        setAutoPlayHeadset(config.autoPlayOnWiredHeadsetConnect);
    }, []);

    async function handleChange(value: string) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num > 40) {
            Alert.alert("Invalid", "Crossfade must be between 0 and 40");
            return;
        }

        setCrossfade(value);
        setIsSaving(true);
        try {
            await apiPatchNoResponse(
                "/user/crossfade",
                UpdateCrossfadeRequestSchema,
                { crossfade: num }
            );
        } catch {
            Alert.alert("Error", "Failed to save crossfade");
        } finally {
            setIsSaving(false);
        }
    }

    const handleBluetoothToggle = useCallback(async (value: boolean) => {
        setAutoPlayBluetooth(value);
        AudioIntegrationService.setConfig({
            autoPlayOnBluetoothConnect: value,
        });
    }, []);

    const handleHeadsetToggle = useCallback(async (value: boolean) => {
        setAutoPlayHeadset(value);
        AudioIntegrationService.setConfig({
            autoPlayOnWiredHeadsetConnect: value,
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>Cross Fade</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={crossfade}
                        onChangeText={setCrossfade}
                        onBlur={() => handleChange(crossfade)}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                    />
                    <Text style={styles.suffix}>seconds</Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Auto-play on Bluetooth</Text>
                    <Text style={styles.description}>
                        Start playing when a Bluetooth device connects
                    </Text>
                </View>
                <Switch
                    value={autoPlayBluetooth}
                    onValueChange={handleBluetoothToggle}
                    trackColor={{ false: COLORS.gray800, true: COLORS.accent }}
                    thumbColor={COLORS.white}
                />
            </View>

            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>Auto-play on Headset</Text>
                    <Text style={styles.description}>
                        Start playing when wired headset connects
                    </Text>
                </View>
                <Switch
                    value={autoPlayHeadset}
                    onValueChange={handleHeadsetToggle}
                    trackColor={{ false: COLORS.gray800, true: COLORS.accent }}
                    thumbColor={COLORS.white}
                />
            </View>

            {isSaving && <Text style={styles.saving}>Saving...</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.gray800,
    },
    label: {
        color: COLORS.white,
        fontSize: 16,
    },
    labelContainer: {
        flex: 1,
        marginRight: 16,
    },
    description: {
        color: COLORS.gray600,
        fontSize: 12,
        marginTop: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    input: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.gray800,
        color: COLORS.white,
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 60,
        textAlign: "center",
    },
    suffix: {
        color: COLORS.gray600,
        fontSize: 14,
    },
    saving: {
        color: COLORS.accent,
        fontSize: 12,
        marginTop: 8,
    },
});
