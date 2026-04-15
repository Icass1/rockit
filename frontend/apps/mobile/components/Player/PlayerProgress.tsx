import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
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

    const progressPercent = duration > 0 ? (seekValue / duration) * 100 : 0;

    useEffect(() => {
        if (!isSeeking) setSeekValue(currentTime);
    }, [currentTime, isSeeking]);

    return (
        <View style={styles.container}>
            <View style={styles.sliderContainer}>
                <View style={styles.track}>
                    <View
                        style={[styles.fill, { width: `${progressPercent}%` }]}
                    >
                        <LinearGradient
                            colors={[
                                COLORS.accent,
                                COLORS.accentMid,
                                COLORS.accentLight,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                </View>
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
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor={COLORS.white}
                />
            </View>
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
    sliderContainer: {
        position: "relative",
        height: 40,
    },
    track: {
        position: "absolute",
        top: 16,
        left: 0,
        right: 0,
        height: 7,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 4,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
        width: "100%",
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
