import { useStore } from "@nanostores/react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { User } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVocabulary } from "@/lib/vocabulary";
import { webSocketManager } from "@/lib/webSocketManager";
import NotificationButton from "@/components/Notifications/NotificationButton";

export const HEADER_HEIGHT = 90;

interface HeaderProps {
    showSearch?: boolean;
    showNotifications?: boolean;
}

export default function Header({ showNotifications = false }: HeaderProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const onlineUsers = useStore(webSocketManager.onlineUsersAtom);
    const { vocabulary, lang } = useVocabulary();
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient
                colors={[
                    theme.legacy.bg,
                    withAlpha(theme.colors.background, 0.9),
                    "transparent",
                ]}
                locations={[0, 0.6, 1]}
                style={styles.gradient}
            />
            <View style={styles.content}>
                <View
                    testID="header-online-users"
                    accessibilityRole="text"
                    accessibilityLabel={`${onlineUsers ?? "—"} · ${vocabulary.ONLINE_LABEL}`}
                    style={styles.presence}
                >
                    <Text style={styles.onlineCount}>
                        {onlineUsers === undefined
                            ? "—"
                            : new Intl.NumberFormat(lang, {
                                  notation: "compact",
                                  maximumFractionDigits: 1,
                              }).format(onlineUsers)}
                    </Text>
                    <User
                        size={theme.typography.subtitle}
                        color={theme.colors.online}
                    />
                </View>
                <Image
                    testID="rockit-header-logo"
                    accessibilityLabel="RockIt!"
                    source={require("@/assets/images/logo-banner.png")}
                    style={styles.logo}
                    contentFit="contain"
                />
                <View style={styles.actionSlot}>
                    {showNotifications && <NotificationButton />}
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "transparent",
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: theme.spacing.sm,
        },
        logo: {
            flex: 1,
            maxWidth: 210,
            height: 68,
        },
        actionSlot: {
            width: theme.layout.touchTarget + theme.spacing.md,
            height: theme.layout.touchTarget,
            alignItems: "center",
            justifyContent: "center",
        },
        presence: {
            width: theme.layout.touchTarget + theme.spacing.md,
            height: theme.layout.touchTarget,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
        },
        onlineCount: {
            color: theme.colors.online,
            fontSize: theme.typography.body,
            fontWeight: "600",
        },
        gradient: {
            ...StyleSheet.absoluteFill,
        },
    });
