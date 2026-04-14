import { memo, ReactNode, useCallback } from "react";
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
import { ContextMenuOption, useContextMenu } from "@/lib/ContextMenuContext";
import { useVocabulary } from "@/lib/vocabulary";

interface MediaRowProps {
    media: TMedia | BaseSearchResultsItem;
    onPress?: () => void;
    rightElement?: ReactNode;
}

function MediaRow({ media, onPress, rightElement }: MediaRowProps) {
    const { show } = useContextMenu();
    const { vocabulary } = useVocabulary();

    // const imageStyle = circularImage
    //     ? { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }
    //     : { width: imageSize, height: imageSize, borderRadius: 4 };

    const imageStyle = "";

    const handleLongPress = useCallback(() => {
        const options: ContextMenuOption[] = [];

        options.push({
            label: vocabulary.REMOVE_FROM_LIBRARY,
            icon: "trash",
            onPress: () => {},
        });

        show({
            imageUrl: media.imageUrl,
            title: media.name,
            subtitle: getMediaSubtitle(media),
            options: options,
        });
    }, [media, vocabulary, show]);

    const content = (
        <Pressable style={styles.container} onLongPress={handleLongPress}>
            <Image
                source={media.imageUrl}
                style={[styles.image, imageStyle]}
                contentFit="cover"
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {media.name}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {getMediaSubtitle(media)}
                </Text>
            </View>
            {rightElement && (
                <View style={styles.rightElement}>{rightElement}</View>
            )}
        </Pressable>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {content}
            </Pressable>
        );
    }

    if (isNavigable(media)) {
        return <Link href={("(app)/" + media.url) as never}>{content}</Link>;
    }

    return content;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 16,
        gap: 12,
    },
    image: {
        backgroundColor: COLORS.bgCard,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "500",
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
    },
    rightElement: {
        marginLeft: 8,
    },
    pressed: {
        opacity: 0.7,
    },
});

export default memo(MediaRow);
