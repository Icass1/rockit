import { useCallback } from "react";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { API_ENDPOINTS, UserPlaylistsResponseSchema } from "@rockit/shared";
import { FlatList, StyleSheet, View } from "react-native";
import { z } from "zod";
import { apiGet } from "@/lib/api";
import {
    useContextMenu,
    type ContextMenuConfig,
} from "@/lib/ContextMenuContext";
import SectionTitle from "@/components/layout/SectionTitle";
import ArtistAvatar from "@/components/Media/ArtistAvatar";
import MediaCard from "@/components/Media/MediaCard";
import MediaRow from "@/components/Media/MediaRow";

type ItemLayout = "row" | "grid" | "artist";

interface SearchSectionProps {
    title: string;
    items: BaseSearchResultsItem[];
    layout?: ItemLayout;
}

export default function SearchSection({
    title,
    items,
    layout = "row",
}: SearchSectionProps) {
    const { show, hide } = useContextMenu();

    const buildMainMenu = useCallback(
        (item: BaseSearchResultsItem): ContextMenuConfig => ({
            imageUrl: item.imageUrl,
            title: item.title,
            subtitle: item.artists?.map((a) => a.name).join(", "),
            options: [
                {
                    label: "Add to library",
                    icon: "heart",
                    onPress: async () => {
                        hide();
                        await apiGet(
                            `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(item.providerUrl)}`,
                            z.unknown()
                        );
                    },
                },
                {
                    label: "Add to playlist",
                    icon: "plus-circle",
                    onPress: () => showPlaylistPicker(item),
                },
            ],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hide, show]
    );

    const showPlaylistPicker = useCallback(
        async (item: BaseSearchResultsItem) => {
            let playlists: {
                publicId: string;
                name: string;
                imageUrl: string;
            }[] = [];
            try {
                const res = await apiGet(
                    API_ENDPOINTS.userPlaylists,
                    UserPlaylistsResponseSchema
                );
                playlists = res.playlists;
            } catch {
                // fall through with empty list
            }

            show({
                imageUrl: item.imageUrl,
                title: "Add to playlist",
                subtitle: item.title,
                backAction: () => show(buildMainMenu(item)),
                options: playlists.map((pl) => ({
                    label: pl.name,
                    icon: "music" as const,
                    onPress: async () => {
                        hide();
                        await apiGet(
                            `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(item.providerUrl)}&playlist_public_id=${encodeURIComponent(pl.publicId)}`,
                            z.unknown()
                        );
                    },
                })),
            });
        },
        [show, hide, buildMainMenu]
    );

    const handlePress = useCallback(
        (item: BaseSearchResultsItem) => {
            show(buildMainMenu(item));
        },
        [show, buildMainMenu]
    );

    const renderGridItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <View style={styles.gridItem}>
                <MediaCard
                    imageUrl={item.imageUrl}
                    title={item.title}
                    subtitle={item.artists?.map((a) => a.name).join(", ")}
                    onPress={() => handlePress(item)}
                />
            </View>
        ),
        [handlePress]
    );

    const renderRowItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <MediaRow
                imageUrl={item.imageUrl}
                title={item.title}
                subtitle={item.artists?.map((a) => a.name).join(", ")}
                onPress={() => handlePress(item)}
            />
        ),
        [handlePress]
    );

    const renderArtistItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <View style={styles.artistItem}>
                <ArtistAvatar
                    imageUrl={item.imageUrl}
                    name={item.title}
                    onPress={() => handlePress(item)}
                />
            </View>
        ),
        [handlePress]
    );

    const renderItem =
        layout === "grid"
            ? renderGridItem
            : layout === "artist"
              ? renderArtistItem
              : renderRowItem;

    const keyExtractor = useCallback(
        (item: BaseSearchResultsItem) => item.url,
        []
    );

    if (items.length === 0) return null;

    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                numColumns={layout === "grid" ? 2 : 1}
                columnWrapperStyle={
                    layout === "grid" ? styles.gridRow : undefined
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                removeClippedSubviews={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    gridItem: {
        flex: 1,
        margin: 4,
        maxWidth: "50%",
    },
    gridRow: {
        justifyContent: "flex-start",
    },
    artistItem: {
        alignItems: "center",
        width: 100,
        marginHorizontal: 8,
    },
});
