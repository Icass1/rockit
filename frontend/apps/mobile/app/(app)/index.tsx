import { COLORS } from "@/constants/theme";
import { API_ENDPOINTS, HomeStatsResponseSchema } from "@rockit/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useApiFetch } from "@/lib/useApiFetch";
import { HomeContent } from "@/components/Home";
import { PageContainer } from "@/components/layout";
import Header from "@/components/layout/Header";

export default function HomeScreen() {
    const { data, loading, error } = useApiFetch(
        API_ENDPOINTS.homeStats,
        HomeStatsResponseSchema
    );

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

    if (error || !data) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>
                        {error ?? "Failed to load"}
                    </Text>
                </View>
            </>
        );
    }

    const hasContent =
        data.songsByTimePlayed.length > 0 ||
        data.randomSongsLastMonth.length > 0 ||
        data.hiddenGems.length > 0 ||
        data.communityTop.length > 0 ||
        data.monthlyTop.length > 0;

    if (!hasContent) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No music yet</Text>
                </View>
            </>
        );
    }

    return (
        <>
            <Header />
            <PageContainer>
                <HomeContent data={data} />
            </PageContainer>
        </>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: { color: COLORS.accent, fontSize: 16 },
    emptyText: { color: COLORS.gray400, fontSize: 16 },
});
