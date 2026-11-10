import { useCallback } from "react";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { EEvent, EventManager } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Heart, Music, PlusCircle } from "@rockit/ui/icons";
import { FlatList, StyleSheet, View } from "react-native";
import {
    useContextMenu,
    type ContextMenuConfig,
} from "@/lib/ContextMenuContext";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";
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
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const { show, hide } = useContextMenu();

    const buildMainMenu = useCallback(
        (item: BaseSearchResultsItem): ContextMenuConfig => ({
            imageUrl: item.imageUrl,
            title: item.name,
            subtitle: item.artists?.map((a) => a.name).join(", "),
            options: [
                {
                    label: vocabulary.ADD_TO_LIBRARY,
                    icon: Heart,
                    onPress: async () => {
                        hide();
                        const result = await Http.addFromUrlAsync({
                            url: item.providerUrl,
                            addToLibrary: true,
                            addToPlaylist: false,
                            playlistPublicId: null,
                        });
                        if (result.isOk() && result.result?.data) {
                            EventManager.getInstance().dispatchEvent(
                                EEvent.MediaAddedToLibrary,
                                { publicId: result.result.data.publicId }
                            );
                        }
                    },
                },
                {
                    label: vocabulary.ADD_MEDIA_TO_PLAYLIST,
                    icon: PlusCircle,
                    onPress: () => showPlaylistPicker(item),
                },
            ],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hide, show, vocabulary]
    );

    const showPlaylistPicker = useCallback(
        async (item: BaseSearchResultsItem) => {
            let playlists: {
                publicId: string;
                name: string;
                imageUrl: string;
            }[] = [];
            try {
                const res = await Http.getUserPlaylistsAsync();
                if (res.isOk() && res.result) {
                    playlists = res.result.playlists;
                }
            } catch {
                // fall through with empty list
            }

            show({
                imageUrl: item.imageUrl,
                title: vocabulary.ADD_MEDIA_TO_PLAYLIST,
                subtitle: item.name,
                backAction: () => show(buildMainMenu(item)),
                options: playlists.map((pl) => ({
                    label: pl.name,
                    icon: Music,
                    onPress: async () => {
                        hide();
                        const result = await Http.addFromUrlAsync({
                            url: item.providerUrl,
                            addToLibrary: false,
                            addToPlaylist: true,
                            playlistPublicId: pl.publicId,
                        });
                        if (result.isOk() && result.result?.data) {
                            const eventManager = EventManager.getInstance();
                            eventManager.dispatchEvent(
                                EEvent.MediaAddedToLibrary,
                                { publicId: result.result.data.publicId }
                            );
                            eventManager.dispatchEvent(
                                EEvent.MediaAddedToPlaylist,
                                {
                                    publicId: result.result.data.publicId,
                                    playlistPublicId: pl.publicId,
                                    position: 0,
                                }
                            );
                        }
                    },
                })),
            });
        },
        [show, hide, buildMainMenu, vocabulary]
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
                <MediaCard media={item} />
            </View>
        ),
        [styles]
    );

    const renderRowItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <MediaRow media={item} />
        ),
        []
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
        [handlePress, styles]
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            marginBottom: theme.spacing.xl,
        },
        gridItem: {
            flex: 1,
            margin: theme.spacing.xs,
            maxWidth: "50%",
        },
        gridRow: {
            justifyContent: "flex-start",
        },
        artistItem: {
            alignItems: "center",
            width: 100,
            marginHorizontal: theme.spacing.sm,
        },
    });
