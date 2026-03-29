import { COLORS } from "@/constants/theme";
import { SessionResponseSchema } from "@rockit/shared";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useGreeting } from "@/hooks/useGreeting";
import { useApiFetch } from "@/lib/useApiFetch";

export default function HomeHeader() {
    const greeting = useGreeting();
    const { data: session } = useApiFetch(
        "/user/session",
        SessionResponseSchema
    );
    const username = session?.username ?? "Rockit User";

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.name} numberOfLines={1}>
                    {username}
                </Text>
            </View>
            <TouchableOpacity style={styles.avatar}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>
                        {(username[0] ?? "R").toUpperCase()}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 4,
    },
    textContainer: { flex: 1 },
    greeting: {
        fontSize: 13,
        color: COLORS.gray400,
        fontWeight: "400",
        marginBottom: 2,
    },
    name: {
        fontSize: 22,
        color: COLORS.white,
        fontWeight: "700",
    },
    avatar: { marginLeft: 12 },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarLetter: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "700",
    },
});
