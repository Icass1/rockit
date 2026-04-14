import { useCallback, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import {
    isPlayable,
    isQueueable,
    isSearchResult,
    TPlayableMedia,
    type BaseAlbumWithoutSongsResponse,
    type BasePlaylistResponse,
    type BaseSongWithAlbumResponse,
    type BaseVideoResponse,
    type TMedia,
    type TQueueMedia,
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
    playlists: BasePlaylistResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    activeType: ELibraryActiveType;
    viewMode: "grid" | "list";
    playMedia?: (media: TQueueMedia, queue: TQueueMedia[]) => Promise<void>;
}

type ItemType = "album" | "playlist" | "song" | "video";

interface Section {
    title: string;
    data: TMedia[];
    renderType: "grid" | "list";
}

export default function LibraryContent({
    albums,
    playlists,
    songs,
    videos,
    activeType,
    viewMode,
    playMedia,
}: LibraryContentProps) {
    const { vocabulary } = useVocabulary();

    const handleItemPress = useCallback(
        (item: TPlayableMedia) => {
            if (!playMedia) return;

            if (isQueueable(item)) {
                const allQueueable = [...songs, ...videos].filter(isQueueable);
                playMedia(item, allQueueable);
            }
        },
        [playMedia, songs, videos]
    );

    const sections: Section[] = useMemo(() => {
        const result: Section[] = [];

        const createItems = (items: TMedia[], type: ItemType): TMedia[] =>
            items.filter((item) => item.type === type);

        if (albums.length > 0) {
            result.push({
                title: vocabulary.ALBUMS,
                data: createItems(albums, "album"),
                renderType: viewMode,
            });
        }
        if (playlists.length > 0) {
            result.push({
                title: vocabulary.PLAYLISTS,
                data: createItems(playlists, "playlist"),
                renderType: viewMode,
            });
        }
        if (songs.length > 0) {
            result.push({
                title: vocabulary.SONGS,
                data: createItems(songs, "song"),
                renderType: viewMode,
            });
        }
        if (videos.length > 0) {
            result.push({
                title: vocabulary.VIDEOS,
                data: createItems(videos, "video"),
                renderType: viewMode,
            });
        }
        return result;
    }, [albums, playlists, songs, videos, vocabulary, viewMode]);

    const onItemPress = useCallback(
        (item: TMedia) => {
            if (isPlayable(item)) handleItemPress(item);
        },
        [handleItemPress]
    );

    const renderSectionHeader = useCallback(
        ({ section }: { section: Section }) => (
            <View style={styles.sectionHeader}>
                <SectionTitle>{section.title}</SectionTitle>
            </View>
        ),
        []
    );

    const renderItem = useCallback(
        ({ item, section }: { item: TMedia; section: Section }) => {
            const onPress = isQueueable(item)
                ? () => onItemPress(item)
                : undefined;

            if (section.renderType === "grid") {
                return (
                    <View style={styles.gridItemWrapper}>
                        <MediaCard media={item} onPress={onPress} />
                    </View>
                );
            }
            return <MediaRow media={item} onPress={onPress} />;
        },
        [onItemPress]
    );

    const keyExtractor = useCallback(
        (item: TMedia, index: number) =>
            `${item.type}-${isSearchResult(item) ? item.providerUrl : item.publicId}-${index}`,
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

    let items: any[] = [];
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
        <LibraryGrid items={items} onItemPress={onItemPress} />
    ) : (
        <LibraryListView items={items} onItemPress={onItemPress} />
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
        width: "50%",
        padding: 4,
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
