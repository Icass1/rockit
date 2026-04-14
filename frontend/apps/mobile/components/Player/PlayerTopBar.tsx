import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface PlayerTopBarProps {
    title: string;
    onClose: () => void;
    onSettings: () => void;
    onQueue?: () => void;
    onLyrics?: () => void;
    onRelated?: () => void;
}

export default function PlayerTopBar({
    title,
    onClose,
    onSettings,
    onQueue,
    onLyrics,
    onRelated,
}: PlayerTopBarProps) {
    return (
        <View style={styles.container}>
            <Pressable style={styles.button} onPress={onClose} hitSlop={12}>
                <Feather name="chevron-down" size={28} color={COLORS.white} />
            </Pressable>

            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>

            <View style={styles.rightContainer}>
                {onQueue && (
                    <Pressable
                        style={styles.button}
                        onPress={onQueue}
                        hitSlop={12}
                    >
                        <Feather name="list" size={22} color={COLORS.white} />
                    </Pressable>
                )}
                {onLyrics && (
                    <Pressable
                        style={styles.button}
                        onPress={onLyrics}
                        hitSlop={12}
                    >
                        <Feather
                            name="file-text"
                            size={22}
                            color={COLORS.white}
                        />
                    </Pressable>
                )}
                {onRelated && (
                    <Pressable
                        style={styles.button}
                        onPress={onRelated}
                        hitSlop={12}
                    >
                        <Feather name="users" size={22} color={COLORS.white} />
                    </Pressable>
                )}
                <Pressable
                    style={styles.button}
                    onPress={onSettings}
                    hitSlop={12}
                >
                    <Feather name="sliders" size={22} color={COLORS.white} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    button: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    rightContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        flex: 1,
        textAlign: "center",
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255,255,255,0.85)",
        marginHorizontal: 8,
    },
});
