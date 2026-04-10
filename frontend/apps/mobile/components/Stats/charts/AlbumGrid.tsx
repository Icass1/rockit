import { useCallback } from "react";
import { COLORS } from "@/constants/theme";
import type { StatsRankedItemResponse } from "@rockit/shared";
import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTypedRouter } from "@/lib/useTypedRouter";

interface AlbumGridProps {
    albums: StatsRankedItemResponse[];
}

export default function AlbumGrid({ albums }: AlbumGridProps) {
    const { push } = useTypedRouter();
    const maxValue = albums[0]?.value || 1;

    const handlePress = useCallback(
        (href: string) => {
            if (href) {
                push(href);
            }
        },
        [push]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: StatsRankedItemResponse; index: number }) => (
            <Pressable
                style={styles.card}
                onPress={() => handlePress(item.href)}
            >
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.imageContainer}>
                    {item.imageUrl ? (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.image}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]} />
                    )}
                </View>
                <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                </Text>
                {item.subtitle && (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {item.subtitle}
                    </Text>
                )}
                <View style={styles.progressContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${(item.value / maxValue) * 100}%` },
                        ]}
                    />
                </View>
            </Pressable>
        ),
        [handlePress, maxValue]
    );

    const keyExtractor = useCallback(
        (item: StatsRankedItemResponse) => item.publicId,
        []
    );

    return (
        <FlatList
            data={albums}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            removeClippedSubviews={true}
        />
    );
}

const styles = StyleSheet.create({
    grid: {
        gap: 8,
    },
    row: {
        gap: 8,
        marginBottom: 8,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
    },
    rankBadge: {
        position: "absolute",
        top: 4,
        left: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.7)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    rankText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#ffffff",
    },
    imageContainer: {
        aspectRatio: 1,
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    placeholderImage: {
        backgroundColor: COLORS.bgCard,
    },
    name: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#ffffff",
        paddingHorizontal: 8,
        paddingTop: 6,
    },
    subtitle: {
        fontSize: 10,
        color: COLORS.gray600,
        paddingHorizontal: 8,
        paddingBottom: 4,
    },
    progressContainer: {
        height: 4,
        backgroundColor: "rgba(38,38,38,0.5)",
        marginHorizontal: 8,
        marginBottom: 8,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: COLORS.accent,
        borderRadius: 2,
    },
});
