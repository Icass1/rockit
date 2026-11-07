import { memo } from "react";
import {
    getMediaDuration,
    isDownloadable,
    type TMedia,
    type TPlayableMedia,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Check } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useMedia } from "@/hooks/useMedia";
import { useMediaOffline } from "@/hooks/useMediaOffline";
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
    listPublicId,
}: {
    index: number;
    media: TPlayableMedia;
    allMedia: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
}) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const $media = useMedia(_media);

    const availableOffline = useMediaOffline($media.publicId);
    const duration = getMediaDuration($media);
    const downloaded = !isDownloadable($media) || $media.downloaded;

    return (
        <MediaPressableWrapper
            media={$media}
            allMedia={allMedia}
            listPublicId={listPublicId}
        >
            <View style={styles.container}>
                <View style={styles.imageWrapper}>
                    {showMediaIndex && (
                        <View style={styles.indexContainer}>
                            <Text style={styles.indexText}>{index + 1}</Text>
                        </View>
                    )}
                    {showMediaImage && (
                        <Image
                            source={{ uri: $media.imageUrl }}
                            style={styles.image}
                            contentFit="cover"
                        />
                    )}
                </View>

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
                {availableOffline && (
                    <View style={styles.offlineBadge}>
                        <Check size={10} color={theme.legacy.white} />
                    </View>
                )}
                {duration !== undefined && (
                    <Text style={styles.duration}>
                        {formatDuration(duration)}
                    </Text>
                )}
            </View>
        </MediaPressableWrapper>
    );
});

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
        },
        pressed: {
            opacity: 0.7,
        },
        indexContainer: {
            width: 24,
            height: 24,
            alignItems: "center",
        },
        indexText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
        },
        imageWrapper: {
            position: "relative",
        },
        image: {
            width: 48,
            height: 48,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.legacy.bgCard,
        },
        downloadBadge: {
            position: "absolute",
            bottom: 2,
            right: 2,
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.6),
            borderRadius: theme.radius.md,
            padding: 2,
        },
        offlineBadge: {
            backgroundColor: theme.legacy.accent,
            borderRadius: theme.radius.md,
            padding: 2,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            color: theme.legacy.white,
            fontSize: 15,
            fontWeight: "500",
        },
        titleNotDownloaded: {
            color: theme.legacy.gray400,
        },
        subtitle: {
            color: theme.legacy.gray400,
            fontSize: 13,
            marginTop: 2,
        },
        subtitleNotDownloaded: {
            color: theme.legacy.gray400,
            opacity: 0.6,
        },
        duration: {
            color: theme.legacy.gray400,
            fontSize: 13,
        },
    });
