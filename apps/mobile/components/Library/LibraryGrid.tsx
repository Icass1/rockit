import { memo, useCallback } from "react";
import { TMedia } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { FlatList, StyleSheet, View } from "react-native";
import MediaCard from "@/components/Media/MediaCard";

interface LibraryGridProps {
    items: TMedia[];
}

const GridItem = memo(function GridItem({ media }: { media: TMedia }) {
    return <MediaCard media={media} />;
});

export default function LibraryGrid({ items }: LibraryGridProps) {
    const styles = useThemedStyles(createStyles);
    const renderItem = useCallback(
        ({ item }: { item: TMedia }) => (
            <View style={styles.itemWrapper}>
                <GridItem media={item} />
            </View>
        ),
        [styles]
    );

    const keyExtractor = useCallback(
        (item: TMedia, index: number) =>
            `${item.type}-${item.publicId}-${index}`,
        []
    );

    return (
        <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={true}
        />
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: 100,
        },
        row: {
            gap: theme.spacing.xs,
        },
        itemWrapper: {
            flex: 1,
            maxWidth: "50%",
            padding: theme.spacing.xs,
        },
    });
