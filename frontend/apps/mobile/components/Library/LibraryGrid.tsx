import { memo, useCallback } from "react";
import { TMedia } from "@rockit/shared";
import { FlatList, StyleSheet, View } from "react-native";
import MediaCard from "@/components/Media/MediaCard";

interface LibraryGridProps {
    items: TMedia[];
    onItemPress?: (media: TMedia) => void;
}

const GridItem = memo(function GridItem({
    media,
    onPress,
}: {
    media: TMedia;
    onPress?: () => void;
}) {
    return <MediaCard media={media} onPress={onPress} />;
});

export default function LibraryGrid({ items, onItemPress }: LibraryGridProps) {
    const renderItem = useCallback(
        ({ item }: { item: TMedia }) => (
            <View style={styles.itemWrapper}>
                <GridItem media={item} onPress={() => onItemPress?.(item)} />
            </View>
        ),
        [onItemPress]
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

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    row: {
        gap: 4,
    },
    itemWrapper: {
        flex: 1,
        maxWidth: "50%",
        padding: 4,
    },
});
