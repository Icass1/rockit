import { useCallback, useState } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Switch, View } from "react-native";
import { AudioIntegrationService } from "@/lib/audio/AudioIntegration";
import { useVocabulary } from "@/lib/vocabulary";
import SettingRow from "@/components/Settings/SettingRow";

export default function AudioDeviceSettings() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const [autoPlayBluetooth, setAutoPlayBluetooth] = useState(
        () => AudioIntegrationService.getConfig().autoPlayOnBluetoothConnect
    );
    const [autoPlayHeadset, setAutoPlayHeadset] = useState(
        () => AudioIntegrationService.getConfig().autoPlayOnWiredHeadsetConnect
    );

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
            <SettingRow
                label={vocabulary.AUDIO_AUTOPLAY_BLUETOOTH}
                value={
                    <Switch
                        value={autoPlayBluetooth}
                        onValueChange={handleBluetoothToggle}
                        trackColor={{
                            false: theme.legacy.gray800,
                            true: theme.legacy.accent,
                        }}
                        thumbColor={theme.legacy.white}
                    />
                }
                isLast={false}
            />
            <SettingRow
                label={vocabulary.AUDIO_AUTOPLAY_HEADSET}
                value={
                    <Switch
                        value={autoPlayHeadset}
                        onValueChange={handleHeadsetToggle}
                        trackColor={{
                            false: theme.legacy.gray800,
                            true: theme.legacy.accent,
                        }}
                        thumbColor={theme.legacy.white}
                    />
                }
                isLast={true}
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingVertical: theme.spacing.xs,
        },
    });
