import { memo, useCallback } from "react";
import useHandlePlay from "@/callbacks/handlePlay";
import {
    API_ENDPOINTS,
    BaseSearchResultsItem,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
    EEvent,
    EventManager,
    getMediaSubtitle,
    isList,
    isPlayable,
    isSearchResult,
    TMedia,
    UserPlaylistsResponseSchema,
} from "@rockit/shared";
import { Heart, Music, Play, PlusCircle } from "lucide-react-native";
import { Pressable } from "react-native";
import { apiGet } from "@/lib/api";
import {
    ContextMenuConfig,
    ContextMenuOption,
    useContextMenu,
} from "@/lib/ContextMenuContext";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

interface MediaCardProps {
    media: TMedia | BaseSearchResultsItem;
    allMedia: TMedia[];
    children: React.ReactNode;
}

const MediaPressableWrapper = memo(function MediaPressableWrapper({
    media,
    allMedia,
    children,
}: MediaCardProps) {
    const { show, hide } = useContextMenu();
    const { vocabulary } = useVocabulary();
    const router = useTypedRouter();
    const handlePlay = useHandlePlay();

    const buildMainMenu = useCallback(
        (media: TMedia | BaseSearchResultsItem): ContextMenuConfig => {
            const options: ContextMenuOption[] = [];

            options.push({
                label: "Add to library",
                icon: Heart,
                onPress: async () => {
                    hide();
                    const result = await apiGet(
                        `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(media.providerUrl)}`,
                        BaseSongWithAlbumResponseSchema.or(
                            BaseVideoResponseSchema
                        )
                    );
                    EventManager.getInstance().dispatchEvent(
                        EEvent.MediaAddedToLibrary,
                        { publicId: result.publicId }
                    );
                },
            });

            options.push({
                label: vocabulary.ADD_MEDIA_TO_PLAYLIST,
                icon: PlusCircle,
                showArrow: true,
                onPress: () => showPlaylistPicker(media),
            });

            if (!isSearchResult(media) && isPlayable(media)) {
                options.push({
                    label: vocabulary.PLAY,
                    icon: Play,
                    onPress: () => {
                        console.log("Playing media from context menu", media);
                        handlePlay(media, allMedia);
                        hide();
                    },
                });
            }

            return {
                imageUrl: media.imageUrl,
                title: media.name,
                subtitle: getMediaSubtitle(media),
                options: options,
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hide, show]
    );

    const showPlaylistPicker = useCallback(
        async (item: TMedia | BaseSearchResultsItem) => {
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

    const handleLongPress = useCallback(() => {
        if (!isSearchResult(media)) {
            show(buildMainMenu(media));
        }
    }, [media, show, buildMainMenu]);

    const handlePress = useCallback(() => {
        if (isSearchResult(media)) {
            show(buildMainMenu(media));
        } else if (isPlayable(media)) {
            handlePlay(media, allMedia);
        } else if (isList(media)) {
            router.push(media.url);
        }
    }, [media, allMedia, router, show, buildMainMenu, handlePlay]);

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={250}
            style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}
        >
            {children}
        </Pressable>
    );
});

export default MediaPressableWrapper;
