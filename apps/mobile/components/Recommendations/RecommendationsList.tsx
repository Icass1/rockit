import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
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
import { Image } from "expo-image";
import { Download, Music } from "lucide-react-native";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";

const RECOMMENDATIONS_LIMIT = 10;

/**
 * Songs recommended from a seed song, rendered under a list screen. Songs the
 * server has no audio file for still show their metadata, greyed out; tapping
 * one fetches it. Suggestions the instance already has downloaded (flagged
 * with downloaded + publicId) play right away; the rest are resolved through
 * a single on-demand search (or provider URL, when one exists).
 */
export default function RecommendationsList({
    seedSongPublicId,
}: {
    seedSongPublicId: string;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [songs, setSongs] = useState<BaseSongWithAlbumResponse[]>([]);
    const [discover, setDiscover] = useState<BaseSearchResultsItem[]>([]);
    const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(
        new Set()
    );

    useEffect(() => {
        let cancelled = false;
        Http.getRelatedSongs(seedSongPublicId, RECOMMENDATIONS_LIMIT).then(
            (response) => {
                if (cancelled) return;
                setSongs(response.isOk() ? response.result.songs : []);
                setDiscover(response.isOk() ? response.result.discover : []);
            }
        );
        return () => {
            cancelled = true;
        };
    }, [seedSongPublicId]);

    const releaseKey = (key: string): void => {
        setDownloadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    const handleSongPress = async (song: BaseSongWithAlbumResponse) => {
        if (!isDownloadable(song) || song.downloaded) {
            rockIt.queueManager.addMediaNext(song);
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
            if (isQueueable(media)) rockIt.queueManager.addMediaNext(media);
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

    if (songs.length === 0 && discover.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{$vocabulary.RECOMMENDED_SONGS}</Text>

            {songs.map((item) => {
                const needsDownload = isDownloadable(item) && !item.downloaded;
                const isDownloading = downloadingKeys.has(item.publicId);
                return (
                    <Row
                        key={item.publicId}
                        name={item.name}
                        artists={getMediaArtistsString(item)}
                        imageUrl={item.imageUrl}
                        dimmed={needsDownload}
                        showDownload={needsDownload}
                        isDownloading={isDownloading}
                        onPress={() => handleSongPress(item)}
                    />
                );
            })}

            {discover.map((item) => {
                const key = getDiscoverKey(item);
                const isDownloading = downloadingKeys.has(key);
                const inLibrary = isDiscoverItemInLibrary(item);
                return (
                    <Row
                        key={key}
                        name={item.name}
                        artists={item.artists.map((a) => a.name).join(", ")}
                        imageUrl={item.imageUrl}
                        dimmed={!inLibrary}
                        showDownload={!inLibrary}
                        isDownloading={isDownloading}
                        onPress={() => handleDiscoverPress(item)}
                    />
                );
            })}
        </View>
    );
}

function Row({
    name,
    artists,
    imageUrl,
    dimmed,
    showDownload,
    isDownloading,
    onPress,
}: {
    name: string;
    artists: string;
    imageUrl: string;
    dimmed: boolean;
    showDownload: boolean;
    isDownloading: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={styles.row}
            disabled={isDownloading}
            onPress={onPress}
        >
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={[styles.image, dimmed && styles.imageDimmed]}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                    <Music size={18} color={COLORS.gray600} />
                </View>
            )}
            <View style={styles.info}>
                <Text
                    style={[styles.title, dimmed && styles.titleDimmed]}
                    numberOfLines={1}
                >
                    {name}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {artists}
                </Text>
            </View>
            {isDownloading ? (
                <ActivityIndicator size="small" color={COLORS.gray400} />
            ) : (
                showDownload && <Download size={18} color={COLORS.gray400} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 32,
    },
    header: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
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
    imageDimmed: {
        opacity: 0.6,
    },
    imagePlaceholder: {
        alignItems: "center",
        justifyContent: "center",
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
    titleDimmed: {
        color: COLORS.gray400,
    },
    artist: {
        fontSize: 12,
        color: COLORS.gray400,
    },
});
