import { useMemo, useState } from "react";
import type {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseStationResponse,
    BaseVideoResponse,
    FilterMode,
} from "@rockit/shared";
import { filterBySearch, sortItems } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { LayoutGrid, List } from "@rockit/ui/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useLibrarySongSearch } from "@/hooks/useLibrarySongSearch";
import { useVocabulary } from "@/lib/vocabulary";
import LibraryContent from "@/components/Library/LibraryContent";
import LibraryFilters from "@/components/Library/LibraryFilters";
import NavigationAnchors from "@/components/Navigation/NavigationAnchors";
import SearchBar from "@/components/Search/SearchBar";

interface LibraryScreenProps {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    stations: BaseStationResponse[];
    shared: BasePlaylistWithoutMediasResponse[];
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
    stations,
    shared,
    searchQuery,
    onSearchChange,
    activeType,
    onTypeChange,
    sortMode,
}: LibraryScreenProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
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

    const searchEnabled =
        activeType === ELibraryActiveType.All ||
        activeType === ELibraryActiveType.Songs;
    const songSearch = useLibrarySongSearch(
        searchQuery,
        searchEnabled,
        sortMode === "asc"
            ? "name_asc"
            : sortMode === "desc"
              ? "name_desc"
              : "relevance"
    );
    const filteredSongs = useMemo(
        () =>
            searchEnabled
                ? searchQuery.trim()
                    ? songSearch.items
                    : sortItems(songs, sortMode)
                : [],
        [searchEnabled, searchQuery, songSearch.items, songs, sortMode]
    );

    const filteredVideos = useMemo(() => {
        const filtered =
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Videos
                ? filterBySearch(videos, searchQuery)
                : [];
        return sortItems(filtered, sortMode);
    }, [videos, searchQuery, activeType, sortMode]);

    const filteredStations = useMemo(
        () =>
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Stations
                ? sortItems(filterBySearch(stations, searchQuery), sortMode)
                : [],
        [stations, searchQuery, sortMode, activeType]
    );
    const filteredShared = useMemo(
        () =>
            activeType === ELibraryActiveType.All ||
            activeType === ELibraryActiveType.Shared
                ? sortItems(filterBySearch(shared, searchQuery), sortMode)
                : [],
        [shared, searchQuery, sortMode, activeType]
    );
    return (
        <>
            <View style={{ height: theme.layout.mobileContentTop }} />
            {!searchQuery.trim() && activeType === ELibraryActiveType.All && (
                <NavigationAnchors />
            )}
            <SearchBar
                value={searchQuery}
                onChangeText={onSearchChange}
                isSearching={songSearch.loading}
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
                    {viewMode === "grid" ? (
                        <List size={28} color={theme.legacy.white} />
                    ) : (
                        <LayoutGrid size={28} color={theme.legacy.white} />
                    )}
                </Pressable>
            </View>

            {songSearch.error && (
                <Pressable
                    accessibilityRole="button"
                    onPress={songSearch.retry}
                >
                    <Text style={{ color: theme.colors.destructive }}>
                        {vocabulary.ERROR} · {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
            <LibraryContent
                albums={filteredAlbums}
                playlists={filteredPlaylists}
                songs={filteredSongs}
                videos={filteredVideos}
                stations={filteredStations}
                shared={filteredShared}
                activeType={activeType}
                viewMode={viewMode}
            />
            {songSearch.hasMore && (
                <Pressable
                    accessibilityRole="button"
                    onPress={songSearch.loadMore}
                    disabled={songSearch.loading}
                    style={{ padding: theme.spacing.md }}
                >
                    <Text style={{ color: theme.colors.primary }}>
                        {vocabulary.SEARCH_LOAD_MORE}
                    </Text>
                </Pressable>
            )}
        </>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        controlsRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingRight: theme.spacing.sm,
        },
        filtersContainer: {
            flex: 1,
        },
        viewToggle: {
            paddingVertical: 10,
            paddingHorizontal: theme.spacing.md,
        },
    });
