import { useCallback, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import type {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
    TQueueMedia,
} from "@rockit/shared";
import { SectionList, StyleSheet, Text, View } from "react-native";
import type { EContentType } from "@/hooks/useLibraryData";
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
    activeType: EContentType;
    viewMode: "grid" | "list";
    playMedia?: (media: TQueueMedia, queue: TQueueMedia[]) => Promise<void>;
}

function getHref(type: string, publicId: string): string {
    switch (type) {
        case "album":
            return `/album/${publicId}`;
        case "playlist":
            return `/playlist/${publicId}`;
        case "song":
            return `/song/${publicId}`;
        case "video":
            return `/video/${publicId}`;
        default:
            return `/`;
    }
}

function formatSubtitle(type: string, item: any): string {
    switch (type) {
        case "album":
            return (
                item.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist"
            );
        case "playlist":
            return item.owner || "Unknown Owner";
        default:
            return (
                item.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist"
            );
    }
}

type ItemType = "album" | "playlist" | "song" | "video";

interface FormattedItem {
    publicId: string;
    name: string;
    imageUrl: string;
    subtitle?: string;
    href?: string;
    originalItem: any;
    itemType: ItemType;
}

interface Section {
    title: string;
    data: FormattedItem[];
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
        (item: TQueueMedia, type: string) => {
            if (!playMedia) return;

            if (type === "song") {
                playMedia(item, songs as TQueueMedia[]);
            } else if (type === "video") {
                playMedia(item, videos as TQueueMedia[]);
            }
        },
        [playMedia, songs, videos]
    );

    const sections: Section[] = useMemo(() => {
        const result: Section[] = [];

        const createItems = (items: any[], type: ItemType): FormattedItem[] =>
            items.map((item) => ({
                publicId: item.publicId,
                name: item.name,
                imageUrl: item.imageUrl || "",
                subtitle: formatSubtitle(type, item),
                href:
                    type === "album" || type === "playlist"
                        ? getHref(type, item.publicId)
                        : undefined,
                originalItem: item,
                itemType: type,
            }));

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
        (item: any, itemType: ItemType) => {
            if (itemType === "song" || itemType === "video") {
                handleItemPress(item, itemType);
            }
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
        ({ item, section }: { item: FormattedItem; section: Section }) => {
            const onPress =
                item.itemType === "song" || item.itemType === "video"
                    ? () => onItemPress(item.originalItem, item.itemType)
                    : undefined;

            if (section.renderType === "grid") {
                return (
                    <View style={styles.gridItemWrapper}>
                        <MediaCard
                            imageUrl={item.imageUrl}
                            title={item.name}
                            subtitle={item.subtitle}
                            href={item.href}
                            onPress={onPress}
                        />
                    </View>
                );
            }
            return (
                <MediaRow
                    imageUrl={item.imageUrl}
                    title={item.name}
                    subtitle={item.subtitle}
                    href={item.href}
                    onPress={onPress}
                />
            );
        },
        [onItemPress]
    );

    const keyExtractor = useCallback(
        (item: FormattedItem, index: number) =>
            `${item.itemType}-${item.publicId}-${index}`,
        []
    );

    if (activeType === "all") {
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
        case "albums":
            items = albums;
            break;
        case "playlists":
            items = playlists;
            break;
        case "songs":
            items = songs;
            break;
        case "videos":
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

    const typeMap: Record<string, ItemType> = {
        albums: "album",
        playlists: "playlist",
        songs: "song",
        videos: "video",
    };

    const itemType = typeMap[activeType] || "song";
    const formattedItems = items.map((item) => ({
        publicId: item.publicId,
        name: item.name,
        imageUrl: item.imageUrl || "",
        subtitle: formatSubtitle(itemType, item),
        href:
            itemType === "album" || itemType === "playlist"
                ? getHref(itemType, item.publicId)
                : undefined,
        originalItem: item,
        itemType,
    }));

    return viewMode === "grid" ? (
        <LibraryGrid items={formattedItems} onItemPress={onItemPress} />
    ) : (
        <LibraryListView items={formattedItems} onItemPress={onItemPress} />
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
