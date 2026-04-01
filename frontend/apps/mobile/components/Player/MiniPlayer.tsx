import { useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

export const MINI_PLAYER_HEIGHT = 64;

export default function MiniPlayer() {
    const {
        currentMedia,
        isPlaying,
        isLoading,
        togglePlayPause,
        skipForward,
        showPlayer,
        activeMediaType,
    } = usePlayer();

    const scale = useRef(new Animated.Value(1)).current;
    const handlePressIn = () =>
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 50,
        }).start();
    const handlePressOut = () =>
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
        }).start();

    if (!currentMedia) return null;

    return (
        <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
            <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />

            <View style={[styles.accent, isPlaying && styles.accentActive]} />

            <Pressable
                style={styles.content}
                onPress={showPlayer}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <View style={styles.thumbnailContainer}>
                    <Image
                        source={{ uri: currentMedia.imageUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={200}
                    />
                    {activeMediaType === "video" && (
                        <View style={styles.videoBadge}>
                            <Feather name="video" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentMedia.name}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentMedia.artists[0]?.name ?? ""}
                    </Text>
                </View>

                <Pressable
                    style={styles.controlButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    hitSlop={12}
                >
                    <Feather
                        name={
                            isLoading ? "loader" : isPlaying ? "pause" : "play"
                        }
                        size={22}
                        color={COLORS.white}
                    />
                </Pressable>

                <Pressable
                    style={styles.controlButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        skipForward();
                    }}
                    hitSlop={12}
                >
                    <Feather
                        name="skip-forward"
                        size={22}
                        color={COLORS.white}
                    />
                </Pressable>
            </Pressable>

            <View style={styles.progressTrack} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        height: MINI_PLAYER_HEIGHT,
        width: "100%",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.12)",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "rgba(18, 18, 18, 0.92)",
    },
    blurFallback: {
        backgroundColor: "rgba(18, 18, 18, 0.92)",
    },
    accent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: "transparent",
    },
    accentActive: {
        backgroundColor: COLORS.accent,
    },
    content: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        gap: 12,
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: COLORS.bgCard,
    },
    thumbnailContainer: {
        position: "relative",
    },
    videoBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: 4,
        padding: 2,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
        marginBottom: 2,
    },
    artist: {
        fontSize: 12,
        color: COLORS.gray400,
    },
    controlButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    progressTrack: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: "rgba(238,16,134,0.3)",
    },
});
