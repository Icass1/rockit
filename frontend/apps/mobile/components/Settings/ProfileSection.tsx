import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useSettingsUser } from "@/hooks/useSettingsUser";
import LogoutButton from "./LogoutButton";
import StatsButton from "./StatsButton";

export default function ProfileSection() {
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
                        {username || "User"}
                    </Text>
                    <Text style={styles.atUsername}>@{username || "user"}</Text>
                </View>
            )}

            {admin && (
                <View style={styles.adminBadge}>
                    <Text style={styles.adminText}>Admin</Text>
                </View>
            )}

            <View style={styles.actions}>
                <StatsButton />
                <LogoutButton />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        paddingVertical: 24,
        gap: 16,
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 750,
        borderWidth: 2,
        borderColor: COLORS.gray800,
    },
    userInfo: {
        alignItems: "center",
    },
    username: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "bold",
    },
    atUsername: {
        color: COLORS.gray600,
        fontSize: 14,
        marginTop: 2,
    },
    adminBadge: {
        backgroundColor: "rgba(238, 16, 134, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminText: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: "600",
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    skeleton: {
        alignItems: "center",
        gap: 8,
    },
    skeletonName: {
        width: 120,
        height: 22,
        backgroundColor: COLORS.gray800,
        borderRadius: 4,
    },
    skeletonUsername: {
        width: 80,
        height: 16,
        backgroundColor: COLORS.gray800,
        borderRadius: 4,
    },
});
