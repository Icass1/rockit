import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useGreeting } from "@/hooks/useGreeting";
import { Http } from "@/lib/http";
import useFetch from "@/lib/useFetch";

export default function HomeHeader() {
    const styles = useThemedStyles(createStyles);
    const greeting = useGreeting();
    const { data: session } = useFetch(Http.getSession);
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: theme.spacing.md,
            marginBottom: theme.spacing.xs,
        },
        textContainer: { flex: 1 },
        greeting: {
            fontSize: 13,
            color: theme.legacy.gray400,
            fontWeight: "400",
            marginBottom: 2,
        },
        name: {
            fontSize: 22,
            color: theme.legacy.white,
            fontWeight: "700",
        },
        avatar: { marginLeft: theme.spacing.md },
        avatarCircle: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.legacy.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarLetter: {
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            fontWeight: "700",
        },
    });
