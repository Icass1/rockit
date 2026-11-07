import { useCallback } from "react";
import type { StatsRankedItemResponse } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTypedRouter } from "@/lib/useTypedRouter";

interface AlbumGridProps {
    albums: StatsRankedItemResponse[];
}

export default function AlbumGrid({ albums }: AlbumGridProps) {
    const styles = useThemedStyles(createStyles);
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
        [handlePress, maxValue, styles]
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        grid: {
            gap: theme.spacing.sm,
        },
        row: {
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
        },
        card: {
            flex: 1,
            backgroundColor: theme.legacy.bgCard,
            borderRadius: theme.radius.lg,
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
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.7),
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
        },
        rankText: {
            fontSize: 10,
            fontWeight: "bold",
            color: theme.colors["foreground-strong"],
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
            backgroundColor: theme.legacy.bgCard,
        },
        name: {
            fontSize: theme.typography.caption,
            fontWeight: "bold",
            color: theme.colors["foreground-strong"],
            paddingHorizontal: theme.spacing.sm,
            paddingTop: 6,
        },
        subtitle: {
            fontSize: 10,
            color: theme.legacy.gray600,
            paddingHorizontal: theme.spacing.sm,
            paddingBottom: theme.spacing.xs,
        },
        progressContainer: {
            height: 4,
            backgroundColor: withAlpha(theme.colors["surface-raised"], 0.5),
            marginHorizontal: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
            borderRadius: theme.radius.xs,
            overflow: "hidden",
        },
        progressBar: {
            height: "100%",
            backgroundColor: theme.legacy.accent,
            borderRadius: theme.radius.xs,
        },
    });
