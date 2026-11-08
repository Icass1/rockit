import { confirmAction } from "@/platform/confirmAction";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { LogOut } from "@rockit/ui/icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { logout } from "@/lib/session";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function LogoutButton() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const { vocabulary } = useVocabulary();

    async function handleLogout() {
        if (
            !(await confirmAction(
                vocabulary.LOG_OUT,
                vocabulary.MOBILE_LOG_OUT_CONFIRM,
                vocabulary.LOG_OUT,
                vocabulary.CANCEL
            ))
        )
            return;
        if (await logout()) router.replace("/(auth)/login");
        else toasterManager.notifyError(vocabulary.ERROR);
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
                <LogOut size={18} color={theme.colors["destructive"]} />
                <Text style={styles.text}>{vocabulary.LOG_OUT}</Text>
            </View>
        </Pressable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        button: {
            backgroundColor: withAlpha(theme.colors["destructive"], 0.15),
            borderRadius: theme.radius.lg,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.xl,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonPressed: {
            backgroundColor: withAlpha(theme.colors["destructive"], 0.3),
        },
        content: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        text: {
            color: theme.colors["destructive"],
            fontSize: theme.typography.label,
            fontWeight: "600",
        },
    });
