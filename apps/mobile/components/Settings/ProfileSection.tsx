import { useState } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { pickProfilePhoto } from "@/platform/pickProfilePhoto";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Camera } from "@rockit/ui/icons";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSettingsUser } from "@/hooks/useSettingsUser";
import { Http } from "@/lib/http";
import { userManager } from "@/lib/managers/userManager";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import LogoutButton from "@/components/Settings/LogoutButton";
import StatsButton from "@/components/Settings/StatsButton";

export default function ProfileSection() {
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const { username, image, admin, isLoading } = useSettingsUser();

    const [uploading, setUploading] = useState(false);
    const upload = async () => {
        if (uploading) return;
        const session = userManager.sessionAtom.get();
        const current = () =>
            !!session && userManager.sessionAtom.get() === session;
        setUploading(true);
        try {
            const photo = await pickProfilePhoto();
            if (!current() || photo.status === "cancelled") return;
            if (photo.status !== "selected") {
                toasterManager.notifyError(
                    photo.status === "denied"
                        ? vocabulary.MOBILE_PHOTO_PERMISSION
                        : vocabulary.MOBILE_PHOTO_INVALID
                );
                return;
            }
            const response = await Http.uploadProfileImage(
                photo.file,
                photo.filename
            );
            if (!current()) return;
            if (!response.isOk()) throw new Error(response.message);
            const fresh = await Http.getSession();
            if (!current()) return;
            if (!fresh.isOk()) throw new Error(fresh.message);
            userManager.seedSession(fresh.result);
        } catch {
            if (current())
                toasterManager.notifyError(vocabulary.MOBILE_PHOTO_ERROR);
        } finally {
            setUploading(false);
        }
    };
    return (
        <View style={styles.container}>
            <Pressable
                style={styles.avatarContainer}
                accessibilityRole="button"
                accessibilityLabel={vocabulary.MOBILE_PHOTO_CHANGE}
                disabled={uploading}
                onPress={() => void upload()}
            >
                <Image
                    source={image || PLACEHOLDER.user}
                    style={styles.avatar}
                    contentFit="cover"
                />
                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        padding: 10,
                        borderRadius: 24,
                        backgroundColor: styles.avatar.backgroundColor,
                    }}
                >
                    {uploading ? (
                        <ActivityIndicator />
                    ) : (
                        <Camera size={22} color={styles.username.color} />
                    )}
                </View>
            </Pressable>

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
            backgroundColor: theme.colors.secondary,
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
