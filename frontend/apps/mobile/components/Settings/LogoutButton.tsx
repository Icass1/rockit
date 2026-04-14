import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { clearSessionCookie } from "@/lib/api";
import { useVocabulary } from "@/lib/vocabulary";

export default function LogoutButton() {
    const router = useRouter();
    const { vocabulary } = useVocabulary();

    async function handleLogout() {
        Alert.alert(vocabulary.LOG_OUT, "Are you sure you want to log out?", [
            { text: vocabulary.CANCEL, style: "cancel" },
            {
                text: vocabulary.LOG_OUT,
                style: "destructive",
                onPress: async () => {
                    await clearSessionCookie();
                    router.replace("/(auth)/login");
                },
            },
        ]);
    }

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            onPress={handleLogout}
        >
            <View style={styles.content}>
                <Feather name="log-out" size={18} color="#f87171" />
                <Text style={styles.text}>{vocabulary.LOG_OUT}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "rgba(220, 38, 38, 0.15)",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        backgroundColor: "rgba(220, 38, 38, 0.3)",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    text: {
        color: "#f87171",
        fontSize: 16,
        fontWeight: "600",
    },
});
