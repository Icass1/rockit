import { memo, useCallback } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import type { BaseArtistResponse, TQueueMedia } from "@rockit/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayer } from "@/lib/PlayerContext";

interface BaseMediaItem {
    publicId: string;
    name: string;
    imageUrl?: string;
    artists?: { name: string }[];
    duration_ms?: number | null;
    [key: string]: unknown;
}

interface RenderListProps {
    title: string;
    subtitle?: string;
    imageUrl: string;
    artists?: BaseArtistResponse[];
    media: BaseMediaItem[];
    showMediaIndex?: boolean;
    showMediaImage?: boolean;
}

function formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const MediaItemComponent = memo(function MediaItemComponent({
    media,
    index,
    showIndex,
    showImage,
    onPress,
}: {
    media: BaseMediaItem;
    index: number;
    showIndex: boolean;
    showImage: boolean;
    onPress: () => void;
}) {
    const title = media.name;
    const artistNames = media.artists?.map((a) => a.name).join(", ") || "";
    const duration = media.duration_ms ?? null;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.mediaItem,
                pressed && styles.pressed,
            ]}
        >
            {showIndex && (
                <View style={styles.indexContainer}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                </View>
            )}
            {showImage && (
                <Image
                    source={{ uri: media.imageUrl || PLACEHOLDER.song }}
                    style={styles.mediaImage}
                    contentFit="cover"
                />
            )}
            <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={styles.mediaArtist} numberOfLines={1}>
                    {artistNames}
                </Text>
            </View>
            {duration !== null && duration > 0 && (
                <Text style={styles.duration}>{formatDuration(duration)}</Text>
            )}
        </Pressable>
    );
});

export default memo(function RenderList({
    title,
    subtitle,
    imageUrl,
    artists = [],
    media,
    showMediaIndex = false,
    showMediaImage = true,
}: RenderListProps) {
    const { playMedia } = usePlayer();

    const handleMediaPress = useCallback(
        (item: BaseMediaItem) => {
            playMedia(item as TQueueMedia, media as TQueueMedia[]);
        },
        [playMedia, media]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: BaseMediaItem; index: number }) => (
            <MediaItemComponent
                media={item}
                index={index}
                showIndex={showMediaIndex}
                showImage={showMediaImage}
                onPress={() => handleMediaPress(item)}
            />
        ),
        [showMediaIndex, showMediaImage, handleMediaPress]
    );

    const keyExtractor = useCallback(
        (item: BaseMediaItem) => item.publicId,
        []
    );

    const ListHeader = useCallback(() => {
        const artistNames = artists.map((a) => a.name).join(", ");

        return (
            <View style={styles.header}>
                <LinearGradient
                    colors={[COLORS.bgCard, "transparent"]}
                    style={styles.gradient}
                />
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl || PLACEHOLDER.playlist }}
                        style={styles.coverImage}
                        contentFit="cover"
                    />
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={2}>
                        {title}
                    </Text>
                    {artistNames && (
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {artistNames}
                        </Text>
                    )}
                    {subtitle && (
                        <Text style={styles.extraSubtitle} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    )}
                    <Text style={styles.mediaCount}>
                        {media.length} {media.length === 1 ? "song" : "songs"}
                    </Text>
                </View>
            </View>
        );
    }, [title, subtitle, imageUrl, artists, media.length]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <FlatList
                data={media}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
            />
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    listContent: {
        paddingBottom: 120,
    },
    header: {
        alignItems: "center",
        paddingTop: 80,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    gradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    imageContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    coverImage: {
        width: 220,
        height: 220,
        borderRadius: 12,
        backgroundColor: COLORS.bgCard,
    },
    titleContainer: {
        alignItems: "center",
        marginTop: 20,
    },
    title: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
    },
    subtitle: {
        color: COLORS.gray400,
        fontSize: 14,
        marginTop: 4,
    },
    extraSubtitle: {
        color: COLORS.gray400,
        fontSize: 13,
        marginTop: 2,
    },
    mediaCount: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 8,
    },
    mediaItem: {
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
    mediaImage: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: COLORS.bgCard,
    },
    mediaInfo: {
        flex: 1,
        minWidth: 0,
    },
    mediaTitle: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "500",
    },
    mediaArtist: {
        color: COLORS.gray400,
        fontSize: 13,
        marginTop: 2,
    },
    duration: {
        color: COLORS.gray400,
        fontSize: 13,
    },
});
