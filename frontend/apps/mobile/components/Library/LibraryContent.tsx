import { COLORS } from "@/constants/theme";
import type {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
    TQueueMedia,
} from "@rockit/shared";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { EContentType } from "@/hooks/useLibraryData";
import { usePlayer } from "@/lib/PlayerContext";
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
                "Unknown Artist" // TODO: This should use vocabulary.
            );
        case "playlist":
            return item.owner || "Unknown Owner";
        default:
            return (
                item.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist" // TODO: This should use vocabulary.
            );
    }
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
    const { playMedia } = usePlayer();

    const handleItemPress = (item: TQueueMedia, type: string) => {
        console.log("handleItemPress");
        if (type === "song") {
            playMedia(item, songs);
        } else if (type === "video") {
            playMedia(item, videos);
        }
    };

    const gridItems = (items: any[], type: string) =>
        items.map((item) => ({
            publicId: item.publicId,
            name: item.name,
            imageUrl: item.imageUrl,
            subtitle: formatSubtitle(type, item),
            href:
                type === "album" || type === "playlist"
                    ? getHref(type, item.publicId)
                    : undefined,
            onPress:
                type === "song" || type === "video"
                    ? () => handleItemPress(item, type)
                    : undefined,
        }));

    const listItems = (items: any[], type: string) =>
        items.map((item) => ({
            publicId: item.publicId,
            name: item.name,
            imageUrl: item.imageUrl,
            subtitle: formatSubtitle(type, item),
            href:
                type === "album" || type === "playlist"
                    ? getHref(type, item.publicId)
                    : undefined,
            onPress:
                type === "song" || type === "video"
                    ? () => handleItemPress(item, type)
                    : undefined,
        }));

    if (activeType === "all") {
        const sections = [
            ...(albums.length > 0
                ? [
                      {
                          title: vocabulary.ALBUMS,
                          data: gridItems(albums, "album"),
                          renderType: viewMode as "grid" | "list",
                      },
                  ]
                : []),
            ...(playlists.length > 0
                ? [
                      {
                          title: vocabulary.PLAYLISTS,
                          data: gridItems(playlists, "playlist"),
                          renderType: viewMode as "grid" | "list",
                      },
                  ]
                : []),
            ...(songs.length > 0
                ? [
                      {
                          title: vocabulary.SONGS,
                          data: listItems(songs, "song"),
                          renderType: viewMode as "grid" | "list",
                      },
                  ]
                : []),
            ...(videos.length > 0
                ? [
                      {
                          title: vocabulary.VIDEOS,
                          data: listItems(videos, "video"),
                          renderType: viewMode as "grid" | "list",
                      },
                  ]
                : []),
        ];

        return (
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.sectionListContent}
                showsVerticalScrollIndicator={false}
            >
                {sections.map((section) => (
                    <View key={section.title} style={styles.sectionWrapper}>
                        <View style={styles.section}>
                            <SectionTitle>{section.title}</SectionTitle>
                        </View>
                        {section.renderType === "grid" ? (
                            <View style={styles.gridContainer}>
                                {section.data.map((item, _) => (
                                    <View
                                        key={item.publicId}
                                        style={styles.gridItemContainer}
                                    >
                                        <MediaCard
                                            imageUrl={item.imageUrl}
                                            title={item.name}
                                            subtitle={item.subtitle}
                                            href={item.href}
                                            onPress={item.onPress}
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View>
                                {section.data.map((item) => (
                                    <MediaRow
                                        key={item.publicId}
                                        imageUrl={item.imageUrl}
                                        title={item.name}
                                        subtitle={item.subtitle}
                                        href={item.href}
                                        onPress={item.onPress}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>
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

    const typeMap: Record<string, string> = {
        albums: "album",
        playlists: "playlist",
        songs: "song",
        videos: "video",
    };

    const itemType = typeMap[activeType] || "song";
    const formattedItems = listItems(items, itemType);

    return viewMode === "grid" ? (
        <LibraryGrid items={formattedItems} />
    ) : (
        <LibraryListView items={formattedItems} />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionWrapper: {
        marginBottom: 0,
    },
    section: {
        marginBottom: 0,
    },
    sectionListContent: {
        paddingHorizontal: 16,
    },
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    gridItemContainer: {
        width: "50%",
        paddingHorizontal: 8,
        paddingVertical: 8,
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
