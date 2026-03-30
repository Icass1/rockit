import { useState } from "react";
import { COLORS } from "@/constants/theme";
import type { FilterMode } from "@rockit/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLibraryData, type ContentType } from "@/hooks/useLibraryData";
import { useVocabulary } from "@/lib/vocabulary";
import LibraryContent from "@/components/Library/LibraryContent";
import LibraryFilters from "@/components/Library/LibraryFilters";
import SearchBar from "@/components/Search/SearchBar";

interface LibraryScreenProps {
    albums: ReturnType<typeof useLibraryData>["albums"];
    playlists: ReturnType<typeof useLibraryData>["playlists"];
    songs: ReturnType<typeof useLibraryData>["songs"];
    loading?: boolean;
}

export default function LibraryScreen({
    albums,
    playlists,
    songs,
    loading: dataLoading,
}: LibraryScreenProps) {
    const { vocabulary } = useVocabulary();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<ContentType>("all");
    const [sortMode] = useState<FilterMode>("default");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const {
        albums: filteredAlbums,
        playlists: filteredPlaylists,
        songs: filteredSongs,
    } = useLibraryData({
        filterMode: sortMode,
        searchQuery,
        activeType,
    });

    const finalAlbums = dataLoading ? albums : filteredAlbums;
    const finalPlaylists = dataLoading ? playlists : filteredPlaylists;
    const finalSongs = dataLoading ? songs : filteredSongs;

    return (
        <>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                isSearching={!!dataLoading}
                onClear={() => setSearchQuery("")}
                placeholder={vocabulary.SEARCH_LIBRARY}
            />

            <View style={styles.controlsRow}>
                <LibraryFilters
                    activeType={activeType}
                    onTypeChange={setActiveType}
                />
                <View style={styles.viewToggle}>
                    <Pressable
                        style={[
                            styles.viewButton,
                            viewMode === "grid" && styles.viewButtonActive,
                        ]}
                        onPress={() => setViewMode("grid")}
                    >
                        <Text
                            style={[
                                styles.viewIcon,
                                viewMode === "grid" && styles.viewIconActive,
                            ]}
                        >
                            ▦
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.viewButton,
                            viewMode === "list" && styles.viewButtonActive,
                        ]}
                        onPress={() => setViewMode("list")}
                    >
                        <Text
                            style={[
                                styles.viewIcon,
                                viewMode === "list" && styles.viewIconActive,
                            ]}
                        >
                            ☰
                        </Text>
                    </Pressable>
                </View>
            </View>

            <LibraryContent
                albums={finalAlbums}
                playlists={finalPlaylists}
                songs={finalSongs}
                activeType={activeType}
                viewMode={viewMode}
            />
        </>
    );
}

const styles = StyleSheet.create({
    controlsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 16,
    },
    viewToggle: {
        flexDirection: "row",
        gap: 4,
    },
    viewButton: {
        padding: 8,
        borderRadius: 4,
        backgroundColor: COLORS.bgCard,
    },
    viewButtonActive: {
        backgroundColor: COLORS.bgCardLight,
    },
    viewIcon: {
        color: COLORS.gray400,
        fontSize: 16,
    },
    viewIconActive: {
        color: COLORS.white,
    },
});
