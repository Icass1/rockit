import { memo, useCallback } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import {
    getMediaDuration,
    isDownloadable,
    isSong,
    isVideo,
    type BaseArtistResponse,
    type TMedia,
    type TPlayableMedia,
    type TQueueMedia,
} from "@rockit/shared";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useContextMenu } from "@/lib/ContextMenuContext";
import { usePlayer } from "@/lib/PlayerContext";
import { useMedia } from "@/hooks/useMedia";

function formatDuration(seconds: number): string {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getArtistNames(
    media: TPlayableMedia,
    substractArtists: string[]
): BaseArtistResponse[] {
    if (isSong(media) || isVideo(media)) {
        return media.artists.filter(
            (a) => !substractArtists.includes(a.name)
        );
    }
    return [];
}

export const PlayableMedia = memo(function PlayableMedia({
    index,
    media: _media,
    allMedia,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
}: {
    index: number;
    media: TPlayableMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const $media = useMedia(_media);
    const { playMedia } = usePlayer();
    const { show } = useContextMenu();

    const downloaded = !isDownloadable($media) || $media.downloaded;
    const artists = getArtistNames($media, substractArtists);
    const duration = getMediaDuration($media);

    const handlePlay = useCallback(() => {
        if (!allMedia || allMedia.length === 0) return;
        const queueMedia = allMedia.filter(
            (m): m is TQueueMedia => m.type === "song" || m.type === "video"
        );
        if (queueMedia.length === 0) return;
        playMedia($media as TQueueMedia, queueMedia);
    }, [$media, allMedia, playMedia]);

    const handleLongPress = useCallback(() => {
        show({
            imageUrl: $media.imageUrl ?? undefined,
            title: $media.name,
            subtitle:
                artists.length > 0
                    ? artists.map((a) => a.name).join(", ")
                    : undefined,
            options: [
                {
                    label: "Play",
                    icon: "play",
                    onPress: handlePlay,
                },
            ],
        });
    }, [$media, artists, show, handlePlay]);

    return (
        <Pressable
            onPress={handlePlay}
            onLongPress={handleLongPress}
            style={({ pressed }) => [
                styles.container,
                pressed && styles.pressed,
            ]}
        >
            {showMediaIndex && (
                <View style={styles.indexContainer}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                </View>
            )}
            {showMediaImage && (
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: $media.imageUrl || PLACEHOLDER.song }}
                        style={styles.image}
                        contentFit="cover"
                    />
                    {!downloaded && (
                        <View style={styles.downloadBadge}>
                            <Feather
                                name="download"
                                size={10}
                                color={COLORS.white}
                            />
                        </View>
                    )}
                </View>
            )}
            <View style={styles.info}>
                <Text
                    style={[
                        styles.title,
                        !downloaded && styles.titleNotDownloaded,
                    ]}
                    numberOfLines={1}
                >
                    {$media.name}
                </Text>
                {artists.length > 0 && (
                    <Text
                        style={[
                            styles.subtitle,
                            !downloaded && styles.subtitleNotDownloaded,
                        ]}
                        numberOfLines={1}
                    >
                        {artists.map((a) => a.name).join(", ")}
                    </Text>
                )}
            </View>
            {duration !== undefined && (
                <Text style={styles.duration}>{formatDuration(duration)}</Text>
            )}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 12,
    },
    pressed: {
        opacity: 0.7,
    },
    indexContainer: {
        width: 24,
        alignItems: "center",
    },
    indexText: {
        color: COLORS.gray400,
        fontSize: 14,
    },
    imageWrapper: {
        position: "relative",
    },
    image: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: COLORS.bgCard,
    },
    downloadBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 8,
        padding: 2,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "500",
    },
    titleNotDownloaded: {
        color: COLORS.gray400,
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 13,
        marginTop: 2,
    },
    subtitleNotDownloaded: {
        color: COLORS.gray400,
        opacity: 0.6,
    },
    duration: {
        color: COLORS.gray400,
        fontSize: 13,
    },
});
