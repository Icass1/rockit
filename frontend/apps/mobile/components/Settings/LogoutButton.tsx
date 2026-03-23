import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { clearSessionCookie } from "@/lib/api";

export default function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out",
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
            <Text style={styles.text}>Log Out</Text>
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
    text: {
        color: "#f87171",
        fontSize: 16,
        fontWeight: "600",
    },
});
