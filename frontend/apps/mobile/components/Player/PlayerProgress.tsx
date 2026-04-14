import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";
import { usePlayerTime } from "@/lib/PlayerContext";

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlayerProgressProps {
    onSeek: (seconds: number) => void;
}

export default function PlayerProgress({ onSeek }: PlayerProgressProps) {
    const { currentTime, duration } = usePlayerTime();
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(currentTime);

    // Follow playback position unless the user is actively scrubbing
    useEffect(() => {
        if (!isSeeking) setSeekValue(currentTime);
    }, [currentTime, isSeeking]);

    return (
        <View style={styles.container}>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={seekValue}
                onValueChange={(v) => {
                    setIsSeeking(true);
                    setSeekValue(v);
                }}
                onSlidingComplete={(v) => {
                    setIsSeeking(false);
                    onSeek(v);
                }}
                minimumTrackTintColor={COLORS.accent}
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor={COLORS.white}
            />
            <View style={styles.labels}>
                <Text style={styles.time}>{formatTime(seekValue)}</Text>
                <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: 4,
    },
    slider: {
        width: "100%",
        height: 40,
    },
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
