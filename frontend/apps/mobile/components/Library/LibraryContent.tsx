import { useCallback, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import {
    isSearchResult,
    type BaseAlbumWithoutSongsResponse,
    type BasePlaylistWithoutMediasResponse,
    type BaseSongWithAlbumResponse,
    type BaseVideoResponse,
    type TMedia,
} from "@rockit/shared";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useVocabulary } from "@/lib/vocabulary";
import SectionTitle from "@/components/layout/SectionTitle";
import LibraryGrid from "@/components/Library/LibraryGrid";
import LibraryListView from "@/components/Library/LibraryListView";
import MediaCard from "@/components/Media/MediaCard";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryContentProps {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    activeType: ELibraryActiveType;
    viewMode: "grid" | "list";
}

type ItemType = "album" | "playlist" | "song" | "video";

interface Section {
    title: string;
    data: TMedia[][];
    renderType: "grid" | "list";
}

export default function LibraryContent({
    albums,
    playlists,
    songs,
    videos,
    activeType,
    viewMode,
}: LibraryContentProps) {
    const { vocabulary } = useVocabulary();

    const sections: Section[] = useMemo(() => {
        const result: Section[] = [];

        const createRows = (items: TMedia[]): TMedia[][] => {
            if (viewMode === "list") {
                return items.map((item) => [item]);
            }

            const rows: TMedia[][] = [];
            for (let index = 0; index < items.length; index += 2) {
                rows.push(items.slice(index, index + 2));
            }
            return rows;
        };

        const createItems = (items: TMedia[], type: ItemType): TMedia[] =>
            items.filter((item) => item.type === type);

        if (albums.length > 0) {
            result.push({
                title: vocabulary.ALBUMS,
                data: createRows(createItems(albums, "album")),
                renderType: viewMode,
            });
        }
        if (playlists.length > 0) {
            result.push({
                title: vocabulary.PLAYLISTS,
                data: createRows(createItems(playlists, "playlist")),
                renderType: viewMode,
            });
        }
        if (songs.length > 0) {
            result.push({
                title: vocabulary.SONGS,
                data: createRows(createItems(songs, "song")),
                renderType: viewMode,
            });
        }
        if (videos.length > 0) {
            result.push({
                title: vocabulary.VIDEOS,
                data: createRows(createItems(videos, "video")),
                renderType: viewMode,
            });
        }
        return result;
    }, [albums, playlists, songs, videos, vocabulary, viewMode]);

    const renderSectionHeader = useCallback(
        ({ section }: { section: Section }) => (
            <View style={styles.sectionHeader}>
                <SectionTitle>{section.title}</SectionTitle>
            </View>
        ),
        []
    );

    const renderItem = useCallback(
        ({ item, section }: { item: TMedia[]; section: Section }) => {
            if (section.renderType === "grid") {
                return (
                    <View style={styles.gridRow}>
                        {item.map((media) => (
                            <View
                                key={`${media.type}-${isSearchResult(media) ? media.providerUrl : media.publicId}`}
                                style={styles.gridItemWrapper}
                            >
                                <MediaCard media={media} />
                            </View>
                        ))}
                    </View>
                );
            }
            return <MediaRow media={item[0]} />;
        },
        []
    );

    const keyExtractor = useCallback(
        (item: TMedia[], index: number) =>
            `${item[0].type}-${isSearchResult(item[0]) ? item[0].providerUrl : item[0].publicId}-${index}`,
        []
    );

    if (activeType === ELibraryActiveType.All) {
        if (sections.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {vocabulary.NO_RESULTS}
                    </Text>
                </View>
            );
        }

        return (
            <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                ListFooterComponent={<View style={{ height: 100 }} />}
            />
        );
    }

    let items: TMedia[] = [];
    switch (activeType) {
        case ELibraryActiveType.Albums:
            items = albums;
            break;
        case ELibraryActiveType.Playlists:
            items = playlists;
            break;
        case ELibraryActiveType.Songs:
            items = songs;
            break;
        case ELibraryActiveType.Videos:
            items = videos;
            break;
    }

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{vocabulary.NO_RESULTS}</Text>
            </View>
        );
    }

    return viewMode === "grid" ? (
        <LibraryGrid items={items} />
    ) : (
        <LibraryListView items={items} />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingHorizontal: 16,
    },
    sectionHeader: {
        marginBottom: 8,
    },
    gridItemWrapper: {
        flex: 1,
        padding: 4,
    },
    gridRow: {
        flexDirection: "row",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        color: COLORS.gray400,
        fontSize: 16,
    },
});
