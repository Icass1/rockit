import { useState } from "react";
import { COLORS } from "@/constants/theme";
import type { FilterMode } from "@rockit/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useLibraryData } from "@/hooks/useLibraryData";
import Header from "@/components/layout/Header";
import LibraryScreen from "@/components/Library/LibraryScreen";

export default function LibraryPage() {
    const [sortMode] = useState<FilterMode>("default");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<ELibraryActiveType>(
        ELibraryActiveType.All
    );

    const { albums, playlists, songs, videos, loading, error } = useLibraryData(
        {
            filterMode: sortMode,
            searchQuery,
            activeType,
        }
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header />
            <View style={{ flex: 1 }}>
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
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
