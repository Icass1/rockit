import { useCallback, useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { StyleSheet, Switch, View } from "react-native";
import { AudioIntegrationService } from "@/lib/audio/AudioIntegration";
import CrossfadeSettings from "./CrossfadeSettings";
import SettingRow from "./SettingRow";

export default function AudioSection() {
    const [autoPlayBluetooth, setAutoPlayBluetooth] = useState(true);
    const [autoPlayHeadset, setAutoPlayHeadset] = useState(true);

    useEffect(() => {
        const config = AudioIntegrationService.getConfig();
        setAutoPlayBluetooth(config.autoPlayOnBluetoothConnect);
        setAutoPlayHeadset(config.autoPlayOnWiredHeadsetConnect);
    }, []);

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
            <SettingRow label="Cross Fade" value={<CrossfadeSettings />} />
            <SettingRow
                label="Auto‑play on Bluetooth"
                value={
                    <Switch
                        value={autoPlayBluetooth}
                        onValueChange={handleBluetoothToggle}
                        trackColor={{
                            false: COLORS.gray800,
                            true: COLORS.accent,
                        }}
                        thumbColor={COLORS.white}
                    />
                }
                isLast={false}
            />
            <SettingRow
                label="Auto‑play on Headset"
                value={
                    <Switch
                        value={autoPlayHeadset}
                        onValueChange={handleHeadsetToggle}
                        trackColor={{
                            false: COLORS.gray800,
                            true: COLORS.accent,
                        }}
                        thumbColor={COLORS.white}
                    />
                }
                isLast={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
    },
});
