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
    isQueueable,
    isSearchResult,
    isVideo,
    TMedia,
    UserPlaylistsResponseSchema,
} from "@rockit/shared";
import { Download, Heart, Music, Play, PlusCircle } from "lucide-react-native";
import { Pressable } from "react-native";
import { apiFetch } from "@/lib/api";
import {
    ContextMenuConfig,
    ContextMenuOption,
    useContextMenu,
} from "@/lib/ContextMenuContext";
import { createMediaFromDTO, markMediaDownloaded } from "@/lib/database";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { toasterManager } from "@/lib/toasterManager";
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
                label: vocabulary.ADD_TO_LIBRARY,
                icon: Heart,
                onPress: async () => {
                    hide();
                    if (isSearchResult(media)) {
                        toasterManager.notifyWarn(vocabulary.TODO);
                    } else {
                        const response = await apiFetch(
                            `${API_ENDPOINTS.addMediaToLibrary}/${media.publicId}`,
                            BaseSongWithAlbumResponseSchema.or(
                                BaseVideoResponseSchema
                            )
                        );

                        if (response.isOk()) {
                            toasterManager.notifyInfo(
                                vocabulary.MEDIA_ADDED_TO_LIBRARY
                            );
                            EventManager.getInstance().dispatchEvent(
                                EEvent.MediaAddedToLibrary,
                                { publicId: response.result.publicId }
                            );
                        } else {
                            toasterManager.notifyError(
                                vocabulary.FAILED_TO_ADD_MEDIA_TO_LIBRARY
                            );
                        }
                    }
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

            if (!isSearchResult(media) && isQueueable(media)) {
                options.push({
                    label: vocabulary.DOWNLOAD_MEDIA_TO_DEVICE,
                    icon: Download,
                    onPress: async () => {
                        hide();
                        try {
                            toasterManager.notifyInfo(
                                vocabulary.DOWNLOAD_STARTED
                            );

                            const dbMedia = await createMediaFromDTO(media);

                            const url = isVideo(media)
                                ? (media.audioSrc ?? media.videoSrc ?? null)
                                : media.audioSrc;

                            if (!url) {
                                toasterManager.notifyError(
                                    vocabulary.ERROR_STARTING_DOWNLOAD
                                );
                                return;
                            }

                            const localPath = isVideo(media)
                                ? await mediaStorage.downloadVideo(
                                      media.publicId,
                                      url
                                  )
                                : await mediaStorage.downloadSong(
                                      media.publicId,
                                      url
                                  );

                            if (localPath) {
                                await markMediaDownloaded(
                                    dbMedia.id,
                                    localPath
                                );
                                toasterManager.notifySuccess(
                                    vocabulary.MEDIA_ADDED_TO_LIBRARY
                                );
                            } else {
                                toasterManager.notifyError(
                                    vocabulary.ERROR_STARTING_DOWNLOAD
                                );
                            }
                        } catch (e) {
                            console.error("Download failed:", e);
                            toasterManager.notifyError(
                                vocabulary.ERROR_STARTING_DOWNLOAD
                            );
                        }
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
            const res = await apiFetch(
                API_ENDPOINTS.userPlaylists,
                UserPlaylistsResponseSchema
            );

            if (res.isOk()) playlists = res.result.playlists;
            else {
                toasterManager.notifyError(
                    vocabulary.FAILED_TO_FETCH_PLAYLISTS
                );
                return;
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
                        const response = await apiFetch(
                            `${API_ENDPOINTS.mediaAddFromUrl}?url=${encodeURIComponent(item.providerUrl)}&playlist_public_id=${encodeURIComponent(pl.publicId)}`,
                            BaseSongWithAlbumResponseSchema.or(
                                BaseVideoResponseSchema
                            )
                        );
                        if (response.isOk()) {
                            toasterManager.notifySuccess(
                                `${item.name} ${vocabulary.ADDED_TO_PLAYLIST}`
                            );
                        } else {
                            toasterManager.notifyError(
                                vocabulary.FAILED_TO_ADD_MEDIA_TO_PLAYLIST
                            );
                            return;
                        }

                        const eventManager = EventManager.getInstance();
                        eventManager.dispatchEvent(EEvent.MediaAddedToLibrary, {
                            publicId: response.result.publicId,
                        });
                        eventManager.dispatchEvent(
                            EEvent.MediaAddedToPlaylist,
                            {
                                publicId: response.result.publicId,
                                playlistPublicId: pl.publicId,
                            }
                        );
                    },
                })),
            });
        },
        [vocabulary, show, hide, buildMainMenu]
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
