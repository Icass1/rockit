import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function StatsButton() {
    const router = useRouter();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/stats" as const)}
        >
            <View style={styles.content}>
                <Feather name="bar-chart-2" size={18} color="#60a5fa" />
                <Text style={styles.text}>Stats</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        backgroundColor: "rgba(59, 130, 246, 0.3)",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    text: {
        color: "#60a5fa",
        fontSize: 16,
        fontWeight: "600",
    },
});
