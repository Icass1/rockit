import { COLORS } from "@/constants/theme";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <Link href="/">
                <Text style={styles.link}>Go to App</Text>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: "bold",
    },
    link: {
        color: COLORS.accent,
        marginTop: 20,
    },
});
