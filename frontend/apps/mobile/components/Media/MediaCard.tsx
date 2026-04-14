import { memo, useCallback } from "react";
import { COLORS } from "@/constants/theme";
import {
    BaseSearchResultsItem,
    getMediaSubtitle,
    isNavigable,
    TMedia,
} from "@rockit/shared";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import useFullMediaOptions from "@/hooks/contextMenuOptions/useFullMediaOptions";
import { useContextMenu } from "@/lib/ContextMenuContext";

interface MediaCardProps {
    media: TMedia | BaseSearchResultsItem;
    onPress?: () => void;
    aspectRatio?: number;
}

const MediaCardInner = memo(function MediaCardInner({
    media,
    aspectRatio = 1,
    onPress,
}: MediaCardProps) {
    const { show } = useContextMenu();
    const fullOptions = useFullMediaOptions(
        media as Parameters<typeof useFullMediaOptions>[0],
        [],
        false
    );

    const handleLongPress = useCallback(() => {
        show({
            imageUrl: media.imageUrl,
            title: media.name,
            subtitle: getMediaSubtitle(media),
            options: fullOptions,
        });
    }, [show, media, fullOptions]);

    const content = (
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
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                onLongPress={handleLongPress}
                delayLongPress={250}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {content}
            </Pressable>
        );
    }

    if (isNavigable(media)) {
        return (
            <Pressable onLongPress={handleLongPress} delayLongPress={250}>
                <Link href={("/(app)/" + media.url) as never}>{content}</Link>
            </Pressable>
        );
    }

    return content;
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
