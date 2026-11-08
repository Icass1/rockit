import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Bug } from "@rockit/ui/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

export default function LogsButton() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
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
                <Bug size={18} color={theme.colors["muted-foreground"]} />
                <Text style={styles.text}>{vocabulary.LOGS}</Text>
            </View>
        </Pressable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        button: {
            backgroundColor: withAlpha(theme.colors["muted-foreground"], 0.15),
            borderRadius: theme.radius.lg,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.xl,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonPressed: {
            backgroundColor: withAlpha(theme.colors["muted-foreground"], 0.3),
        },
        content: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        text: {
            color: theme.colors["muted-foreground"],
            fontSize: theme.typography.label,
            fontWeight: "600",
        },
    });
