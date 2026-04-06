import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { FilterMode } from "@rockit/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { useLibraryData, type EContentType } from "@/hooks/useLibraryData";
import { useVocabulary } from "@/lib/vocabulary";
import LibraryContent from "@/components/Library/LibraryContent";
import LibraryFilters from "@/components/Library/LibraryFilters";
import SearchBar from "@/components/Search/SearchBar";

interface LibraryScreenProps {
    albums: ReturnType<typeof useLibraryData>["albums"];
    playlists: ReturnType<typeof useLibraryData>["playlists"];
    songs: ReturnType<typeof useLibraryData>["songs"];
    videos: ReturnType<typeof useLibraryData>["videos"];
    loading?: boolean;
}

export default function LibraryScreen({
    albums,
    playlists,
    songs,
    videos,
    loading: dataLoading,
}: LibraryScreenProps) {
    const { vocabulary } = useVocabulary();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<EContentType>("all");
    const [sortMode] = useState<FilterMode>("default");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const {
        albums: filteredAlbums,
        playlists: filteredPlaylists,
        songs: filteredSongs,
        videos: filteredVideos,
    } = useLibraryData({
        filterMode: sortMode,
        searchQuery,
        activeType,
    });

    const finalAlbums = dataLoading ? albums : filteredAlbums;
    const finalPlaylists = dataLoading ? playlists : filteredPlaylists;
    const finalSongs = dataLoading ? songs : filteredSongs;
    const finalVideos = dataLoading ? videos : filteredVideos;

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
                <View style={styles.filtersContainer}>
                    <LibraryFilters
                        activeType={activeType}
                        onTypeChange={setActiveType}
                    />
                </View>
                <Pressable
                    style={styles.viewToggle}
                    onPress={() =>
                        setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                >
                    <Feather
                        name={viewMode === "grid" ? "list" : "grid"}
                        size={28}
                        color={COLORS.white}
                    />
                </Pressable>
            </View>

            <LibraryContent
                albums={finalAlbums}
                playlists={finalPlaylists}
                songs={finalSongs}
                videos={finalVideos}
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
        paddingRight: 8,
    },
    filtersContainer: {
        flex: 1,
    },
    viewToggle: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
});
