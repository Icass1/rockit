import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { BarChart3 } from "@rockit/ui/icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function StatsButton() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const { vocabulary } = useVocabulary();

    return (
        <Pressable
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/stats" as const)}
        >
            <View style={styles.content}>
                <BarChart3 size={18} color={theme.colors["info"]} />
                <Text style={styles.text}>{vocabulary.STATS}</Text>
            </View>
        </Pressable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        button: {
            backgroundColor: withAlpha(theme.colors["info"], 0.15),
            borderRadius: theme.radius.lg,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.xl,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonPressed: {
            backgroundColor: withAlpha(theme.colors["info"], 0.3),
        },
        content: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        text: {
            color: theme.colors["info"],
            fontSize: theme.typography.label,
            fontWeight: "600",
        },
    });
