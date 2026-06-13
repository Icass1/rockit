import { Bug } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTypedRouter } from "@/lib/useTypedRouter";

export default function LogsButton() {
    const { push } = useTypedRouter();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            onPress={() => push("/logs")}
        >
            <View style={styles.content}>
                <Bug size={18} color="#a3a3a3" />
                <Text style={styles.text}>Logs</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "rgba(163, 163, 163, 0.15)",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        backgroundColor: "rgba(163, 163, 163, 0.3)",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    text: {
        color: "#a3a3a3",
        fontSize: 16,
        fontWeight: "600",
    },
});
