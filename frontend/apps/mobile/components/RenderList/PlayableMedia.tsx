import { memo } from "react";
import { COLORS } from "@/constants/theme";
import {
    getMediaDuration,
    isDownloadable,
    type TMedia,
    type TPlayableMedia,
} from "@rockit/shared";
import { Image } from "expo-image";
import { Download } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useMedia } from "@/hooks/useMedia";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";
import MediaSubTitle from "@/components/MediaSubTitle";

function formatDuration(seconds: number): string {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
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
    allMedia: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const $media = useMedia(_media);

    const duration = getMediaDuration($media);
    const downloaded = !isDownloadable($media) || $media.downloaded;

    return (
        <MediaPressableWrapper media={$media} allMedia={allMedia}>
            <View style={styles.container}>
                {showMediaIndex && (
                    <View style={styles.indexContainer}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                    </View>
                )}
                {showMediaImage && (
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: $media.imageUrl }}
                            style={styles.image}
                            contentFit="cover"
                        />
                        {!downloaded && (
                            <View style={styles.downloadBadge}>
                                <Download size={10} color={COLORS.white} />
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
                    <MediaSubTitle
                        style={[
                            styles.subtitle,
                            !downloaded && styles.subtitleNotDownloaded,
                        ]}
                        media={$media}
                        substractArtists={substractArtists}
                    />
                </View>
                {duration !== undefined && (
                    <Text style={styles.duration}>
                        {formatDuration(duration)}
                    </Text>
                )}
            </View>
        </MediaPressableWrapper>
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
