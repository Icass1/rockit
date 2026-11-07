import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
    getDiscoverKey,
    getMediaArtistsString,
    isDiscoverItemInLibrary,
    isDownloadable,
    isQueueable,
    type BaseSearchResultsItem,
    type BaseSongWithAlbumResponse,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Download, Radio } from "@rockit/ui/icons";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Http } from "@/lib/http";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";

const RELATED_LIMIT = 20;

/**
 * PlayerRelated — songs related to whatever is currently playing, based on
 * playlist and listening co-occurrence, plus a "Discover" section sourced
 * from Last.fm. Tapping a downloaded song queues it next; tapping one that
 * has no audio file yet downloads it to the server first. Discover rows that
 * the instance already has play right away; the rest are resolved through a
 * single on-demand search (or provider URL, when one exists).
 */
export default function PlayerRelated() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { currentMedia, addToQueueNext } = usePlayer();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [songs, setSongs] = useState<BaseSongWithAlbumResponse[]>([]);
    const [discover, setDiscover] = useState<BaseSearchResultsItem[]>([]);
    // publicId for known songs, getDiscoverKey() for discover rows.
    const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(
        new Set()
    );
    const [loadedSeed, setLoadedSeed] = useState<string | undefined>();

    const seedPublicId = currentMedia?.publicId;
    const isCurrentSeed =
        seedPublicId !== undefined && loadedSeed === seedPublicId;
    const visibleSongs = isCurrentSeed ? songs : [];
    const visibleDiscover = isCurrentSeed ? discover : [];
    const loading = seedPublicId !== undefined && !isCurrentSeed;

    useEffect(() => {
        if (!seedPublicId) return;

        let cancelled = false;

        Http.getRelatedSongs(seedPublicId, RELATED_LIMIT).then((response) => {
            if (cancelled) return;
            setSongs(response.isOk() ? response.result.songs : []);
            setDiscover(response.isOk() ? response.result.discover : []);
            setLoadedSeed(seedPublicId);
        });

        return () => {
            cancelled = true;
        };
    }, [seedPublicId]);

    const releaseKey = (key: string): void => {
        setDownloadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    const handleDiscoverPress = async (item: BaseSearchResultsItem) => {
        const key = getDiscoverKey(item);
        if (downloadingKeys.has(key)) return;

        if (isDiscoverItemInLibrary(item) && item.publicId) {
            const mediaResult = await rockIt.mediaManager.getMedia(
                item.publicId
            );
            if (!mediaResult.isOk()) {
                toasterManager.notifyError(mediaResult.message);
                return;
            }
            const media = mediaResult.result.media;
            if (isQueueable(media)) addToQueueNext(media);
            return;
        }

        setDownloadingKeys((prev) => new Set(prev).add(key));
        toasterManager.notifyInfo($vocabulary.DOWNLOAD_STARTED);

        const response = item.providerUrl
            ? await Http.startDownloadFromUrl({
                  url: item.providerUrl,
                  addToLibrary: true,
                  addToPlaylist: false,
                  playlistPublicId: null,
              })
            : await Http.startDownloadFromSearch({
                  artistName: item.artists[0]?.name ?? "",
                  trackName: item.name,
                  addToLibrary: true,
                  addToPlaylist: false,
                  playlistPublicId: null,
              });

        releaseKey(key);

        if (response.isOk()) {
            toasterManager.notifySuccess($vocabulary.MEDIA_ADDED_TO_LIBRARY);
        } else {
            toasterManager.notifyError($vocabulary.ERROR_STARTING_DOWNLOAD);
        }
    };

    /** A song can be in the database without its audio file having been
     * fetched yet — queueing that plays nothing, so download it instead. */
    const handleSongPress = async (song: BaseSongWithAlbumResponse) => {
        if (!isDownloadable(song) || song.downloaded) {
            addToQueueNext(song);
            return;
        }

        if (downloadingKeys.has(song.publicId)) return;

        setDownloadingKeys((prev) => new Set(prev).add(song.publicId));
        toasterManager.notifyInfo($vocabulary.DOWNLOAD_STARTED);

        const response = await Http.startDownload({
            ids: [song.publicId],
            title: song.name,
        });

        releaseKey(song.publicId);

        if (response.isOk()) {
            toasterManager.notifySuccess($vocabulary.MEDIA_ADDED_TO_LIBRARY);
        } else {
            toasterManager.notifyError($vocabulary.ERROR_STARTING_DOWNLOAD);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={theme.legacy.gray400} />
            </View>
        );
    }

    if (visibleSongs.length === 0 && visibleDiscover.length === 0) {
        return (
            <View style={styles.center}>
                <Radio size={40} color={theme.legacy.gray400} />
                <Text style={styles.emptyTitle}>
                    {$vocabulary.PLAYER_RELATED_TITLE}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {$vocabulary.PLAYER_RELATED_EMPTY}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        >
            {visibleSongs.length > 0 && (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {$vocabulary.PLAYER_RELATED_TITLE}
                        </Text>
                    </View>
                    {visibleSongs.map((item) => {
                        const needsDownload =
                            isDownloadable(item) && !item.downloaded;
                        const isDownloading = downloadingKeys.has(
                            item.publicId
                        );
                        return (
                            <Pressable
                                key={item.publicId}
                                style={styles.row}
                                disabled={isDownloading}
                                onPress={() => handleSongPress(item)}
                            >
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={[
                                        styles.image,
                                        needsDownload && styles.imageDiscover,
                                    ]}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <View style={styles.info}>
                                    <Text
                                        style={[
                                            styles.title,
                                            needsDownload &&
                                                styles.titleDiscover,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        style={styles.artist}
                                        numberOfLines={1}
                                    >
                                        {getMediaArtistsString(item)}
                                    </Text>
                                </View>
                                {isDownloading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={theme.legacy.gray400}
                                    />
                                ) : (
                                    needsDownload && (
                                        <Download
                                            size={18}
                                            color={theme.legacy.gray400}
                                        />
                                    )
                                )}
                            </Pressable>
                        );
                    })}
                </>
            )}

            {visibleDiscover.length > 0 && (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {$vocabulary.PLAYER_DISCOVER_TITLE}
                        </Text>
                    </View>
                    {visibleDiscover.map((item) => {
                        const key = getDiscoverKey(item);
                        const isDownloading = downloadingKeys.has(key);
                        const inLibrary = isDiscoverItemInLibrary(item);
                        return (
                            <Pressable
                                key={key}
                                style={styles.row}
                                disabled={isDownloading}
                                onPress={() => handleDiscoverPress(item)}
                            >
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={[
                                        styles.image,
                                        !inLibrary && styles.imageDiscover,
                                    ]}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <View style={styles.info}>
                                    <Text
                                        style={[
                                            styles.title,
                                            !inLibrary && styles.titleDiscover,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        style={styles.artist}
                                        numberOfLines={1}
                                    >
                                        {item.artists
                                            .map((a) => a.name)
                                            .join(", ")}
                                    </Text>
                                </View>
                                {isDownloading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={theme.legacy.gray400}
                                    />
                                ) : (
                                    !inLibrary && (
                                        <Download
                                            size={18}
                                            color={theme.legacy.gray400}
                                        />
                                    )
                                )}
                            </Pressable>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: withAlpha(
                theme.colors["foreground-strong"],
                0.1
            ),
        },
        headerTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        list: {
            paddingBottom: theme.spacing.page,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
            gap: theme.spacing.md,
        },
        image: {
            width: 46,
            height: 46,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCard,
        },
        imageDiscover: {
            opacity: 0.7,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.white,
            marginBottom: 2,
        },
        titleDiscover: {
            color: theme.legacy.gray400,
        },
        artist: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
        },
        center: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.md,
        },
        emptyTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        emptySubtitle: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray400,
        },
    });
