import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import {
    API_ENDPOINTS,
    SessionResponse,
    SessionResponseSchema,
} from "@rockit/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { clearSessionCookie } from "@/lib/api";
import { useApiFetch } from "@/lib/useApiFetch";
import Header from "@/components/layout/Header";

export default function SettingsScreen() {
    const router = useRouter();
    const { data, loading, error } = useApiFetch<SessionResponse>(
        API_ENDPOINTS.userSession,
        SessionResponseSchema
    );

    async function handleLogout() {
        await clearSessionCookie();
        router.replace("/(auth)/login");
    }

    if (loading) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            </>
        );
    }

    return (
        <>
            <Header />
            <View style={styles.container}>
                <View style={styles.profileSection}>
                    <Image
                        source={data?.image || PLACEHOLDER.user}
                        style={styles.avatar}
                        contentFit="cover"
                    />
                    <Text style={styles.username}>
                        {data?.username ?? "User"}
                    </Text>
                    {data?.admin && (
                        <Text style={styles.adminBadge}>Admin</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Username</Text>
                        <Text style={styles.settingValue}>
                            {data?.username}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Pressable
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutText}>Log Out</Text>
                    </Pressable>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centerContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
    },
    profileSection: { alignItems: "center", paddingVertical: 32 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    username: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 16,
    },
    adminBadge: { color: COLORS.accent, fontSize: 12, marginTop: 4 },
    section: { paddingHorizontal: 16, paddingVertical: 16 },
    sectionTitle: { color: COLORS.gray400, fontSize: 14, marginBottom: 12 },
    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.gray800,
    },
    settingLabel: { color: COLORS.white, fontSize: 16 },
    settingValue: { color: COLORS.gray400, fontSize: 16 },
    logoutButton: {
        backgroundColor: COLORS.accent,
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
    },
    logoutText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
});
