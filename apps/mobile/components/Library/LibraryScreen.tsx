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
import {
    IconButton,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Download, LayoutGrid, List, X } from "@rockit/ui/icons";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useLibrarySongSearch } from "@/hooks/useLibrarySongSearch";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";
import LibraryContent from "@/components/Library/LibraryContent";
import LibraryFilters from "@/components/Library/LibraryFilters";
import {
    LibrarySelectionProvider,
    useLibrarySelection,
} from "@/components/Library/LibrarySelectionContext";
import FeaturedCollections from "@/components/Navigation/FeaturedCollections";
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

export default function LibraryScreen(props: LibraryScreenProps) {
    return (
        <LibrarySelectionProvider>
            <LibraryScreenContent {...props} />
        </LibrarySelectionProvider>
    );
}
function LibraryScreenContent({
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
    const selection = useLibrarySelection()!;
    const theme = useDesignTheme();
    const router = useTypedRouter();
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
        <View style={{ flex: 1 }}>
            <LibraryContent
                albums={filteredAlbums}
                playlists={filteredPlaylists}
                songs={filteredSongs}
                videos={filteredVideos}
                stations={filteredStations}
                shared={filteredShared}
                activeType={activeType}
                viewMode={viewMode}
                extraData={selection.selected}
                header={
                    <>
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
                                accessibilityRole="button"
                                accessibilityLabel={vocabulary.DOWNLOADS}
                                onPress={() => router.push("/downloader")}
                                style={{
                                    width: theme.layout.touchTarget,
                                    height: theme.layout.touchTarget,
                                    borderRadius: theme.radius.full,
                                    backgroundColor: theme.colors.secondary,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Download
                                    size={theme.typography.title}
                                    color={theme.colors.foreground}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.viewToggle}
                                onPress={() =>
                                    setViewMode(
                                        viewMode === "grid" ? "list" : "grid"
                                    )
                                }
                            >
                                {viewMode === "grid" ? (
                                    <List
                                        size={28}
                                        color={theme.legacy.white}
                                    />
                                ) : (
                                    <LayoutGrid
                                        size={28}
                                        color={theme.legacy.white}
                                    />
                                )}
                            </Pressable>
                        </View>
                        {songSearch.error && (
                            <Pressable
                                accessibilityRole="button"
                                onPress={songSearch.retry}
                            >
                                <Text
                                    style={{ color: theme.colors.destructive }}
                                >
                                    {vocabulary.ERROR} · {vocabulary.RETRY}
                                </Text>
                            </Pressable>
                        )}
                        {!searchQuery.trim() &&
                            (activeType === ELibraryActiveType.All ||
                                activeType ===
                                    ELibraryActiveType.Playlists) && (
                                <>
                                    <FeaturedCollections />
                                    <NavigationAnchors />
                                </>
                            )}
                    </>
                }
                footer={
                    <>
                        {" "}
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
                }
            />
            {selection.active && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.md,
                        backgroundColor: theme.colors.surface,
                        padding: theme.spacing.md,
                    }}
                >
                    <Text
                        accessibilityRole="text"
                        style={{ flex: 1, color: theme.colors.foreground }}
                    >
                        {selection.selected.length}{" "}
                        {vocabulary.LIBRARY_SELECTED}
                    </Text>
                    <IconButton
                        label={vocabulary.DOWNLOAD_ZIP}
                        disabled={selection.busy || !selection.selected.length}
                        onPress={() => void selection.download()}
                    >
                        {selection.busy ? (
                            <ActivityIndicator color={theme.colors.primary} />
                        ) : (
                            <Download color={theme.colors.primary} />
                        )}
                    </IconButton>
                    <IconButton
                        label={vocabulary.CANCEL}
                        onPress={selection.cancel}
                    >
                        <X color={theme.colors.foreground} />
                    </IconButton>
                </View>
            )}
        </View>
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
