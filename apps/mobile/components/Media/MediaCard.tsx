import { memo } from "react";
import {
    BaseSearchResultsItem,
    getMediaSubtitle,
    isSearchResult,
    TMedia,
} from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

interface MediaCardProps {
    media: TMedia | BaseSearchResultsItem;
    aspectRatio?: number;
}

const MediaCardInner = memo(function MediaCardInner({
    media,
    aspectRatio = 1,
}: MediaCardProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <MediaPressableWrapper
            media={media}
            allMedia={!isSearchResult(media) ? [media] : []}
        >
            <View style={styles.container}>
                <Image
                    source={media.imageUrl}
                    style={[styles.image, aspectRatio !== 1 && { aspectRatio }]}
                    contentFit="cover"
                />
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={2}>
                        {media.name}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {getMediaSubtitle(media)}
                    </Text>
                </View>
            </View>
        </MediaPressableWrapper>
    );
});

export default MediaCardInner;

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            width: "100%",
        },
        image: {
            width: "100%",
            aspectRatio: 1,
            borderRadius: theme.radius.md,
            backgroundColor: theme.legacy.bgCard,
        },
        info: {
            width: "100%",
            minWidth: 0,
            marginTop: 6,
            paddingHorizontal: theme.spacing.xs,
            alignItems: "center",
        },
        title: {
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            fontWeight: "600",
            textAlign: "center",
        },
        subtitle: {
            width: "100%",
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            marginTop: 2,
            textAlign: "center",
        },
        pressed: {
            opacity: 0.7,
        },
    });
