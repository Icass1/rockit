import { memo, useCallback, useState } from "react";
import useHandlePlay from "@/callbacks/handlePlay";
import {
    BaseSearchResultsItem,
    EEvent,
    EventManager,
    getAllPlayableMedia,
    getMediaAudioUrl,
    getMediaSubtitle,
    getMediaVideoUrl,
    isList,
    isPlayable,
    isQueueable,
    isSearchResult,
    isSong,
    isStation,
    isVideo,
    TMedia,
} from "@rockit/shared";
import {
    Download,
    Heart,
    ListEnd,
    ListStart,
    Music,
    Pencil,
    Play,
    PlusCircle,
    Shuffle,
} from "lucide-react-native";
import { Pressable } from "react-native";
import {
    ContextMenuConfig,
    ContextMenuOption,
    useContextMenu,
} from "@/lib/ContextMenuContext";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { toasterManager } from "@/lib/toasterManager";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";
import EditMetadataModal from "@/components/EditMetadata/EditMetadataModal";

interface MediaCardProps {
    media: TMedia | BaseSearchResultsItem;
    allMedia: TMedia[];
    children: React.ReactNode;
    extraOptions?: ContextMenuOption[];
    menuOnly?: boolean;
}

const MediaPressableWrapper = memo(function MediaPressableWrapper({
    media,
    allMedia,
    children,
    extraOptions,
    menuOnly,
}: MediaCardProps) {
    const { show, hide } = useContextMenu();
    const { vocabulary } = useVocabulary();
    const router = useTypedRouter();
    const handlePlay = useHandlePlay();
    const [editMetadataMedia, setEditMetadataMedia] = useState<TMedia | null>(
        null
    );

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
                        const response = await Http.addMediaToLibrary(
                            media.publicId
                        );

                        if (response.isOk()) {
                            toasterManager.notifyInfo(
                                vocabulary.MEDIA_ADDED_TO_LIBRARY
                            );
                            EventManager.getInstance().dispatchEvent(
                                EEvent.MediaAddedToLibrary,
                                { publicId: media.publicId }
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
                        handlePlay(media, getAllPlayableMedia(allMedia));
                        hide();
                    },
                });
            }

            if (!isSearchResult(media) && isQueueable(media)) {
                options.push({
                    label: vocabulary.ADD_SONG_TO_QUEUE,
                    icon: ListStart,
                    onPress: () => {
                        rockIt.queueManager.addMediaNext(media);
                        hide();
                    },
                });
                options.push({
                    label: vocabulary.ADD_LIST_RANDOMLY,
                    icon: Shuffle,
                    onPress: () => {
                        rockIt.queueManager.addMediaRandom(media);
                        hide();
                    },
                });
                options.push({
                    label: vocabulary.ADD_LIST_TO_BOTTOM,
                    icon: ListEnd,
                    onPress: () => {
                        rockIt.queueManager.addMediaToEnd(media);
                        hide();
                    },
                });
            }

            if (!isSearchResult(media) && isList(media)) {
                options.push({
                    label: vocabulary.ADD_LIST_TO_QUEUE,
                    icon: ListStart,
                    onPress: () => {
                        hide();
                        rockIt.queueManager.addListToQueueTopAsync(media);
                    },
                });
                options.push({
                    label: vocabulary.ADD_LIST_RANDOMLY,
                    icon: Shuffle,
                    onPress: () => {
                        hide();
                        rockIt.queueManager.addListToQueueRandomAsync(media);
                    },
                });
                options.push({
                    label: vocabulary.ADD_LIST_TO_BOTTOM,
                    icon: ListEnd,
                    onPress: () => {
                        hide();
                        rockIt.queueManager.addListToQueueBottomAsync(media);
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

                            let url: string | null | undefined;

                            if (isVideo(media)) url = getMediaVideoUrl(media);
                            else if (isSong(media))
                                url = getMediaAudioUrl(media);
                            else if (isStation(media)) url = media.streamUrl;
                            else url = null;

                            if (!url) {
                                toasterManager.notifyError(
                                    vocabulary.ERROR_STARTING_DOWNLOAD
                                );
                                return;
                            }

                            let localPath;

                            if (isVideo(media))
                                localPath = await mediaStorage.downloadVideo(
                                    media.publicId,
                                    url
                                );
                            if (isSong(media))
                                localPath = await mediaStorage.downloadSong(
                                    media.publicId,
                                    url
                                );

                            if (localPath) {
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

            if (
                !isSearchResult(media) &&
                (media.type === "song" ||
                    media.type === "video" ||
                    media.type === "album" ||
                    media.type === "artist")
            ) {
                options.push({
                    label: vocabulary.EDIT_METADATA,
                    icon: Pencil,
                    onPress: () => {
                        hide();
                        setEditMetadataMedia(media);
                    },
                });
            }

            if (extraOptions) {
                options.push(...extraOptions);
            }

            return {
                imageUrl: media.imageUrl,
                title: media.name,
                subtitle: getMediaSubtitle(media),
                options: options,
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hide, show, extraOptions]
    );

    const showPlaylistPicker = useCallback(
        async (item: TMedia | BaseSearchResultsItem) => {
            let playlists: {
                publicId: string;
                name: string;
                imageUrl: string;
            }[] = [];
            const res = await Http.getUserPlaylistsAsync();

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
                        const response = await Http.addFromUrlAsync({
                            url: item.providerUrl,
                            addToPlaylist: true,
                            addToLibrary: false,
                            playlistPublicId: pl.publicId,
                        });
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
                            publicId: response.result.data.publicId,
                        });
                        eventManager.dispatchEvent(
                            EEvent.MediaAddedToPlaylist,
                            {
                                publicId: response.result.data.publicId,
                                playlistPublicId: pl.publicId,
                                position: 0,
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
        if (menuOnly || isSearchResult(media)) {
            show(buildMainMenu(media));
        } else if (isPlayable(media)) {
            handlePlay(media, getAllPlayableMedia(allMedia));
        } else if (isList(media)) {
            router.push(media.url);
        }
    }, [media, allMedia, router, show, buildMainMenu, handlePlay, menuOnly]);

    return (
        <>
            <Pressable
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={250}
                style={({ pressed }) =>
                    pressed && { transform: [{ scale: 0.98 }] }
                }
            >
                {children}
            </Pressable>
            {editMetadataMedia && (
                <EditMetadataModal
                    visible={!!editMetadataMedia}
                    media={editMetadataMedia}
                    onClose={(): void => setEditMetadataMedia(null)}
                />
            )}
        </>
    );
});

export default MediaPressableWrapper;
