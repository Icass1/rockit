import { capabilities } from "@/platform/capabilities";
import { View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import AudioDeviceSettings from "@/components/Settings/AudioDeviceSettings";
import CrossfadeSettings from "@/components/Settings/CrossfadeSettings";
import SettingRow from "@/components/Settings/SettingRow";

export default function AudioSection() {
    const { vocabulary } = useVocabulary();
    return (
        <View>
            {capabilities.transitions && (
                <SettingRow
                    label={vocabulary.AUDIO_TRANSITIONS}
                    value={<CrossfadeSettings />}
                />
            )}
            <AudioDeviceSettings />
        </View>
    );
}
