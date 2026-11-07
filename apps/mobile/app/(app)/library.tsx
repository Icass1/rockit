import { useState } from "react";
import type { FilterMode } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useLibraryData } from "@/hooks/useLibraryData";
import Header from "@/components/layout/Header";
import LibraryScreen from "@/components/Library/LibraryScreen";

export default function LibraryPage() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const [sortMode] = useState<FilterMode>("default");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<ELibraryActiveType>(
        ELibraryActiveType.All
    );

    const {
        albums,
        playlists,
        songs,
        videos,
        stations,
        shared,
        loading,
        error,
    } = useLibraryData({
        filterMode: sortMode,
        searchQuery,
        activeType,
    });

    if (loading) {
        return (
            <View style={styles.container}>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator
                        size="large"
                        color={theme.legacy.accent}
                    />
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
                    stations={stations}
                    shared={shared}
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        centerContainer: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
            justifyContent: "center",
            alignItems: "center",
        },
        errorText: {
            color: theme.legacy.accent,
            fontSize: theme.typography.label,
        },
    });
