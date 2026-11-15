import { capabilities } from "@/platform/capabilities";
import { View } from "react-native";
import AudioDeviceSettings from "@/components/Settings/AudioDeviceSettings";
import CrossfadeSettings from "@/components/Settings/CrossfadeSettings";

export default function AudioSection() {
    return (
        <View>
            {capabilities.transitions && <CrossfadeSettings />}
            <AudioDeviceSettings />
        </View>
    );
}
