import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { usePlayerTime } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

const THUMB_SIZE = 30;
const THUMB_HALF = THUMB_SIZE / 2;

interface PlayerProgressProps {
    onSeek: (seconds: number) => void;
}

export default function PlayerProgress({ onSeek }: PlayerProgressProps) {
    const { currentTime, duration } = usePlayerTime();
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(currentTime);
    const [trackWidth, setTrackWidth] = useState(0);

    const progress = duration > 0 ? seekValue / duration : 0;
    const fillWidth = trackWidth > 0 ? progress * trackWidth : 0;

    useEffect(() => {
        if (!isSeeking) setSeekValue(currentTime);
    }, [currentTime, isSeeking]);

    return (
        <View style={styles.container}>
            <View style={styles.sliderContainer}>
                <View
                    style={styles.track}
                    onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                >
                    <LinearGradient
                        colors={[
                            COLORS.accent,
                            COLORS.accentMid,
                            COLORS.accentLight,
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.gradientFill, { width: fillWidth }]}
                    />
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
                {trackWidth > 0 &&
                    $bookmarks.map((bm) => {
                        if (duration <= 0) return null;
                        const offset =
                            THUMB_HALF + (bm.timestamp / duration) * trackWidth;
                        const color =
                            BOOKMARK_MODE_COLORS[bm.mode] ?? "#ffffff";
                        return (
                            <View
                                key={bm.publicId}
                                style={[
                                    styles.bookmarkMarker,
                                    {
                                        left: offset,
                                        backgroundColor: color,
                                    },
                                ]}
                            />
                        );
                    })}
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
        left: THUMB_HALF,
        right: THUMB_HALF,
        height: 7,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 4,
        overflow: "hidden",
    },
    gradientFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
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
    bookmarkMarker: {
        position: "absolute",
        top: 14,
        width: 4,
        height: 11,
        borderRadius: 2,
        zIndex: 10,
    },
});
