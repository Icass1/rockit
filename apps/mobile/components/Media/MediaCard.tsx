import { memo } from "react";
import { COLORS } from "@/constants/theme";
import {
    BaseSearchResultsItem,
    getMediaSubtitle,
    isSearchResult,
    TMedia,
} from "@rockit/shared";
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

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    image: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 8,
        backgroundColor: COLORS.bgCard,
    },
    info: {
        marginTop: 6,
        paddingHorizontal: 4,
        alignItems: "center",
    },
    title: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
        textAlign: "center",
    },
    pressed: {
        opacity: 0.7,
    },
});
