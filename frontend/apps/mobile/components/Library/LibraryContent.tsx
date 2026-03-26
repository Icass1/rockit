import { COLORS } from "@/constants/theme";
import type {
    BaseAlbumWithoutSongsResponse,
    BasePlaylistResponse,
    BaseSongWithoutAlbumResponse,
} from "@rockit/shared";
import { StyleSheet, Text, View } from "react-native";
import type { ContentType } from "@/hooks/useLibraryData";
import SectionTitle from "@/components/layout/SectionTitle";
import LibraryGrid from "@/components/Library/LibraryGrid";
import LibraryListView from "@/components/Library/LibraryListView";

interface LibraryContentProps {
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistResponse[];
    songs: BaseSongWithoutAlbumResponse[];
    activeType: ContentType;
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

export default function LibraryContent({
    albums,
    playlists,
    songs,
    activeType,
    viewMode,
}: LibraryContentProps) {
    const gridItems = (items: any[], type: string) =>
        items.map((item) => ({
            publicId: item.publicId,
            name: item.name,
            imageUrl: item.imageUrl,
            subtitle: formatSubtitle(type, item),
            href: getHref(type, item.publicId),
        }));

    const listItems = (items: any[], type: string) =>
        items.map((item) => ({
            publicId: item.publicId,
            name: item.name,
            imageUrl: item.imageUrl,
            subtitle: formatSubtitle(type, item),
            href: getHref(type, item.publicId),
        }));

    if (activeType === "all") {
        return (
            <View style={styles.container}>
                {albums.length > 0 && (
                    <View style={styles.section}>
                        <SectionTitle>Albums</SectionTitle>
                        {viewMode === "grid" ? (
                            <LibraryGrid items={gridItems(albums, "album")} />
                        ) : (
                            <LibraryListView
                                items={listItems(albums, "album")}
                            />
                        )}
                    </View>
                )}
                {playlists.length > 0 && (
                    <View style={styles.section}>
                        <SectionTitle>Playlists</SectionTitle>
                        {viewMode === "grid" ? (
                            <LibraryGrid
                                items={gridItems(playlists, "playlist")}
                            />
                        ) : (
                            <LibraryListView
                                items={listItems(playlists, "playlist")}
                            />
                        )}
                    </View>
                )}
                {songs.length > 0 && (
                    <View style={styles.section}>
                        <SectionTitle>Songs</SectionTitle>
                        <LibraryListView items={listItems(songs, "song")} />
                    </View>
                )}
            </View>
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
    }

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No items found</Text>
            </View>
        );
    }

    const typeMap: Record<string, string> = {
        albums: "album",
        playlists: "playlist",
        songs: "song",
    };

    const itemType = typeMap[activeType] || "song";
    const formattedItems = listItems(items, itemType);

    return viewMode === "grid" && activeType !== "songs" ? (
        <LibraryGrid items={formattedItems} />
    ) : (
        <LibraryListView items={formattedItems} />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginBottom: 16,
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
