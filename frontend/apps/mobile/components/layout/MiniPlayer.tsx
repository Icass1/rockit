import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function MiniPlayer() {
    const isPlaying = false;
    const currentSong = null;

    if (!currentSong) return null;

    return (
        <View style={styles.container}>
            <Image
                source={require("@/assets/images/icon.png")}
                style={styles.cover}
                contentFit="cover"
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    Song title
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    Artist name
                </Text>
            </View>
            <Pressable
                style={styles.playButton}
                onPress={() => {}}
                accessibilityLabel={isPlaying ? "Pause" : "Play"}
            >
                <Feather
                    name={isPlaying ? "pause" : "play"}
                    color={COLORS.white}
                    size={22}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bgCardLight,
        height: 64,
        paddingHorizontal: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray800,
        gap: 12,
    },
    cover: {
        width: 44,
        height: 44,
        borderRadius: 6,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "600",
    },
    artist: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
    },
    playButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});
