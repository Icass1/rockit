import { COLORS } from "@/constants/theme";
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlayerProgressProps {
    currentTime: number;
    duration: number;
    onSeek: (seconds: number) => void;
}

export default function PlayerProgress({
    currentTime,
    duration,
    onSeek,
}: PlayerProgressProps) {
    return (
        <View style={styles.container}>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={currentTime}
                onSlidingComplete={onSeek}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor={COLORS.white}
            />
            <View style={styles.labels}>
                <Text style={styles.time}>{formatTime(currentTime)}</Text>
                <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: "100%", paddingHorizontal: 4 },
    slider: { width: "100%", height: 40 },
    labels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: -8,
        paddingHorizontal: 4,
    },
    time: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
    },
});
