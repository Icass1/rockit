import { useStore } from "@nanostores/react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { OnlinePresence } from "@rockit/ui/primitives/OnlinePresence";
import { StreakFlame } from "@rockit/ui/primitives/StreakFlame";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Http } from "@/lib/http";
import useFetch from "@/lib/useFetch";
import { useVocabulary } from "@/lib/vocabulary";
import { webSocketManager } from "@/lib/webSocketManager";
import NotificationButton from "@/components/Notifications/NotificationButton";

interface HeaderProps {
    showSearch?: boolean;
    showNotifications?: boolean;
}

export default function Header({ showNotifications = false }: HeaderProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const onlineUsers = useStore(webSocketManager.onlineUsersAtom);
    const { vocabulary, lang } = useVocabulary();
    const { data } = useFetch(Http.getStreak);
    const streak = data?.currentStreak ?? 0;
    const showStreak = showNotifications && streak > 0;
    const streakLabel = streak.toLocaleString(lang);
    const sideStyle = showStreak ? styles.withStreak : undefined;
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
                <View style={[styles.presence, sideStyle]}>
                    <OnlinePresence
                        count={onlineUsers}
                        label={vocabulary.ONLINE_LABEL}
                        locale={lang}
                    />
                </View>
                <Image
                    testID="rockit-header-logo"
                    accessibilityLabel="RockIt!"
                    source={require("@/assets/images/logo-banner.png")}
                    style={styles.logo}
                    contentFit="contain"
                />
                <View style={[styles.actionSlot, sideStyle]}>
                    {showStreak && (
                        <View style={styles.streak} testID="header-streak">
                            <StreakFlame days={streak} size={24} />
                            <Text
                                style={styles.streakCount}
                                accessibilityLabel={`${streakLabel} ${vocabulary.HOME_STREAK_DAYS}`}
                            >
                                {streakLabel}
                            </Text>
                        </View>
                    )}
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
            height: theme.layout.mobileHeaderHeight,
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
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
        },
        withStreak: {
            width: theme.layout.touchTarget + 36,
        },
        streak: {
            minWidth: 32,
            alignItems: "center",
        },
        streakCount: {
            color: theme.colors["streak-foreground"],
            fontSize: theme.typography.caption,
            fontVariant: ["tabular-nums"],
            fontWeight: "600",
        },
        presence: {
            width: theme.layout.touchTarget + theme.spacing.md,
            height: theme.layout.touchTarget,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.xs,
        },
        gradient: {
            ...StyleSheet.absoluteFill,
        },
    });
