import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import {
    getMediaArtistsString,
    isDownloadable,
    type BaseSearchResultsItem,
    type BaseSongWithAlbumResponse,
} from "@rockit/shared";
import { Image } from "expo-image";
import { Download, Radio } from "lucide-react-native";
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
 * from Last.fm for songs this Rockit instance doesn't have yet. Tapping a
 * downloaded song queues it next; tapping one that has no audio file yet —
 * or a discover row — downloads it to the server first.
 */
export default function PlayerRelated() {
    const { currentMedia, addToQueueNext } = usePlayer();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [songs, setSongs] = useState<BaseSongWithAlbumResponse[]>([]);
    const [discover, setDiscover] = useState<BaseSearchResultsItem[]>([]);
    // Keyed by publicId for known songs, providerUrl for discover rows.
    const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(
        new Set()
    );
    const [loading, setLoading] = useState(true);

    const seedPublicId = currentMedia?.publicId;

    useEffect(() => {
        let cancelled = false;

        if (!seedPublicId) {
            setSongs([]);
            setDiscover([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        Http.getRelatedSongs(seedPublicId, RELATED_LIMIT).then((response) => {
            if (cancelled) return;
            setSongs(response.isOk() ? response.result.songs : []);
            setDiscover(response.isOk() ? response.result.discover : []);
            setLoading(false);
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
        if (downloadingKeys.has(item.providerUrl)) return;

        setDownloadingKeys((prev) => new Set(prev).add(item.providerUrl));
        toasterManager.notifyInfo($vocabulary.DOWNLOAD_STARTED);

        const response = await Http.startDownloadFromUrl({
            url: item.providerUrl,
            addToLibrary: true,
            addToPlaylist: false,
            playlistPublicId: null,
        });

        releaseKey(item.providerUrl);

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
                <ActivityIndicator color={COLORS.gray400} />
            </View>
        );
    }

    if (songs.length === 0 && discover.length === 0) {
        return (
            <View style={styles.center}>
                <Radio size={40} color={COLORS.gray400} />
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
            {songs.length > 0 && (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {$vocabulary.PLAYER_RELATED_TITLE}
                        </Text>
                    </View>
                    {songs.map((item) => {
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
                                        color={COLORS.gray400}
                                    />
                                ) : (
                                    needsDownload && (
                                        <Download
                                            size={18}
                                            color={COLORS.gray400}
                                        />
                                    )
                                )}
                            </Pressable>
                        );
                    })}
                </>
            )}

            {discover.length > 0 && (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {$vocabulary.PLAYER_DISCOVER_TITLE}
                        </Text>
                    </View>
                    {discover.map((item) => {
                        const isDownloading = downloadingKeys.has(
                            item.providerUrl
                        );
                        return (
                            <Pressable
                                key={item.providerUrl}
                                style={styles.row}
                                disabled={isDownloading}
                                onPress={() => handleDiscoverPress(item)}
                            >
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    style={[styles.image, styles.imageDiscover]}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <View style={styles.info}>
                                    <Text
                                        style={[
                                            styles.title,
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
                                        {item.artists
                                            .map((a) => a.name)
                                            .join(", ")}
                                    </Text>
                                </View>
                                {isDownloading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={COLORS.gray400}
                                    />
                                ) : (
                                    <Download
                                        size={18}
                                        color={COLORS.gray400}
                                    />
                                )}
                            </Pressable>
                        );
                    })}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    list: {
        paddingBottom: 40,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
    },
    image: {
        width: 46,
        height: 46,
        borderRadius: 6,
        backgroundColor: COLORS.bgCard,
    },
    imageDiscover: {
        opacity: 0.7,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
        marginBottom: 2,
    },
    titleDiscover: {
        color: COLORS.gray400,
    },
    artist: {
        fontSize: 12,
        color: COLORS.gray400,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.gray400,
    },
});
