import { PLACEHOLDER } from "@/constants/assets";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useSettingsUser } from "@/hooks/useSettingsUser";
import { useVocabulary } from "@/lib/vocabulary";
import LogoutButton from "@/components/Settings/LogoutButton";
import StatsButton from "@/components/Settings/StatsButton";

export default function ProfileSection() {
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const { username, image, admin, isLoading } = useSettingsUser();

    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                <Image
                    source={image || PLACEHOLDER.user}
                    style={styles.avatar}
                    contentFit="cover"
                />
            </View>

            {isLoading ? (
                <View style={styles.skeleton}>
                    <View style={styles.skeletonName} />
                    <View style={styles.skeletonUsername} />
                </View>
            ) : (
                <View style={styles.userInfo}>
                    <Text style={styles.username} numberOfLines={1}>
                        {username || vocabulary.USER}
                    </Text>
                    <Text style={styles.atUsername}>
                        @{username || vocabulary.USER}
                    </Text>
                </View>
            )}

            {admin && (
                <View style={styles.adminBadge}>
                    <Text style={styles.adminText}>
                        {vocabulary.MOBILE_ACCOUNT_ADMIN}
                    </Text>
                </View>
            )}

            <View style={styles.actions}>
                <StatsButton />
                <LogoutButton />
            </View>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            alignItems: "center",
            paddingVertical: theme.spacing.xl,
            gap: theme.spacing.lg,
        },
        avatarContainer: {
            position: "relative",
        },
        avatar: {
            width: 150,
            height: 150,
            borderRadius: 750,
            borderWidth: 2,
            borderColor: theme.legacy.gray800,
        },
        userInfo: {
            alignItems: "center",
        },
        username: {
            color: theme.legacy.white,
            fontSize: 22,
            fontWeight: "bold",
        },
        atUsername: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.body,
            marginTop: 2,
        },
        adminBadge: {
            backgroundColor: withAlpha(theme.colors["primary"], 0.15),
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.lg,
        },
        adminText: {
            color: theme.legacy.accent,
            fontSize: theme.typography.caption,
            fontWeight: "600",
        },
        actions: {
            flexDirection: "row",
            gap: theme.spacing.md,
            marginTop: theme.spacing.sm,
        },
        skeleton: {
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        skeletonName: {
            width: 120,
            height: 22,
            backgroundColor: theme.legacy.gray800,
            borderRadius: theme.radius.sm,
        },
        skeletonUsername: {
            width: 80,
            height: 16,
            backgroundColor: theme.legacy.gray800,
            borderRadius: theme.radius.sm,
        },
    });
