import { useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import type { FilterMode, LibraryListsResponse } from "@rockit/shared";
import { filterBySearch, sortItems } from "@rockit/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLibraryData, type EContentType } from "@/hooks/useLibraryData";
import { PageContainer } from "@/components/layout";
import Header from "@/components/layout/Header";
import LibraryScreen from "@/components/Library/LibraryScreen";

export default function LibraryPage() {
    const [sortMode] = useState<FilterMode>("default");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<EContentType>("all");

    const { albums, playlists, songs, videos, loading, error } = useLibraryData(
        {
            filterMode: sortMode,
            searchQuery,
            activeType,
        }
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

    if (error) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </>
        );
    }

    return (
        <>
            <Header />
            <PageContainer horizontalPadding={0}>
                <LibraryScreen
                    albums={albums}
                    playlists={playlists}
                    songs={songs}
                    videos={videos}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeType={activeType}
                    onTypeChange={setActiveType}
                    sortMode={sortMode}
                />
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
    errorText: {
        color: COLORS.accent,
        fontSize: 16,
    },
});
