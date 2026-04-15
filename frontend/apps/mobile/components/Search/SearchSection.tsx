import { useCallback } from "react";
import type { BaseSearchResultsItem } from "@rockit/shared";
import {
    API_ENDPOINTS,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
    EEvent,
    EventManager,
    UserPlaylistsResponseSchema,
} from "@rockit/shared";
import { Heart, Music, PlusCircle } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";
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
            title: item.name,
            subtitle: item.artists?.map((a) => a.name).join(", "),
            options: [
                {
                    label: "Add to library",
                    icon: Heart,
                    onPress: async () => {
                        hide();
                        const result = await apiGet(
                            `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(item.providerUrl)}`,
                            BaseSongWithAlbumResponseSchema.or(
                                BaseVideoResponseSchema
                            )
                        );
                        EventManager.getInstance().dispatchEvent(
                            EEvent.MediaAddedToLibrary,
                            { publicId: result.publicId }
                        );
                    },
                },
                {
                    label: "Add to playlist",
                    icon: PlusCircle,
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
                subtitle: item.name,
                backAction: () => show(buildMainMenu(item)),
                options: playlists.map((pl) => ({
                    label: pl.name,
                    icon: Music,
                    onPress: async () => {
                        hide();
                        const result = await apiGet(
                            `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(item.providerUrl)}&playlist_public_id=${encodeURIComponent(pl.publicId)}`,
                            BaseSongWithAlbumResponseSchema.or(
                                BaseVideoResponseSchema
                            )
                        );
                        const eventManager = EventManager.getInstance();
                        eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                            publicId: result.publicId,
                        });
                        eventManager.dispatchEvent(
                            EEvent.MediaAddedToPlaylist,
                            {
                                publicId: result.publicId,
                                playlistPublicId: pl.publicId,
                            }
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
                <MediaCard media={item} onPress={() => handlePress(item)} />
            </View>
        ),
        [handlePress]
    );

    const renderRowItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <MediaRow media={item} onPress={() => handlePress(item)} />
        ),
        [handlePress]
    );

    const renderArtistItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <View style={styles.artistItem}>
                <ArtistAvatar
                    imageUrl={item.imageUrl}
                    name={item.name}
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
        (item: BaseSearchResultsItem) => item.providerUrl,
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
