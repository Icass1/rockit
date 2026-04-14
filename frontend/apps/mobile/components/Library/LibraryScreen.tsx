import { useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { FilterMode, LibraryListsResponse } from "@rockit/shared";
import { filterBySearch, sortItems } from "@rockit/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { usePlayer } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";
import LibraryContent from "@/components/Library/LibraryContent";
import LibraryFilters from "@/components/Library/LibraryFilters";
import SearchBar from "@/components/Search/SearchBar";

interface LibraryScreenProps {
    albums: LibraryListsResponse["albums"];
    playlists: LibraryListsResponse["playlists"];
    songs: LibraryListsResponse["songs"];
    videos: LibraryListsResponse["videos"];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeType: ELibraryActiveType;
    onTypeChange: (type: ELibraryActiveType) => void;
    sortMode: FilterMode;
}

export default function LibraryScreen({
    albums,
    playlists,
    songs,
    videos,
    searchQuery,
    onSearchChange,
    activeType,
    onTypeChange,
    sortMode,
}: LibraryScreenProps) {
    const { vocabulary } = useVocabulary();
    const { playMedia } = usePlayer();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const filteredAlbums = useMemo(() => {
        const filtered =
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Albums
                ? filterBySearch(albums, searchQuery)
                : [];
        return sortItems(filtered, sortMode);
    }, [albums, searchQuery, activeType, sortMode]);

    const filteredPlaylists = useMemo(() => {
        const filtered =
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Playlists
                ? filterBySearch(playlists, searchQuery)
                : [];
        return sortItems(filtered, sortMode);
    }, [playlists, searchQuery, activeType, sortMode]);

    const filteredSongs = useMemo(() => {
        const filtered =
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Songs
                ? filterBySearch(songs, searchQuery)
                : [];
        return sortItems(filtered, sortMode);
    }, [songs, searchQuery, activeType, sortMode]);

    const filteredVideos = useMemo(() => {
        const filtered =
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Videos
                ? filterBySearch(videos, searchQuery)
                : [];
        return sortItems(filtered, sortMode);
    }, [videos, searchQuery, activeType, sortMode]);

    return (
        <>
            <SearchBar
                value={searchQuery}
                onChangeText={onSearchChange}
                isSearching={false}
                onClear={() => onSearchChange("")}
                placeholder={vocabulary.SEARCH_LIBRARY}
            />

            <View style={styles.controlsRow}>
                <View style={styles.filtersContainer}>
                    <LibraryFilters
                        activeType={activeType}
                        onTypeChange={onTypeChange}
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
                albums={filteredAlbums}
                playlists={filteredPlaylists}
                songs={filteredSongs}
                videos={filteredVideos}
                activeType={activeType}
                viewMode={viewMode}
                playMedia={playMedia}
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
