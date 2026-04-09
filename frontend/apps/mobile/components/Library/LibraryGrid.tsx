import { memo, useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import MediaCard from "@/components/Media/MediaCard";

type ItemType = "album" | "playlist" | "song" | "video";

interface LibraryItemData {
    publicId: string;
    name: string;
    imageUrl: string | null | undefined;
    subtitle?: string;
    href?: string;
    originalItem: any;
    itemType: ItemType;
}

interface LibraryGridProps {
    items: LibraryItemData[];
    onItemPress?: (item: any, itemType: ItemType) => void;
}

const GridItem = memo(function GridItem({
    item,
    onPress,
}: {
    item: LibraryItemData;
    onPress?: () => void;
}) {
    return (
        <MediaCard
            imageUrl={item.imageUrl}
            title={item.name}
            subtitle={item.subtitle}
            href={item.href}
            onPress={onPress}
        />
    );
});

export default function LibraryGrid({ items, onItemPress }: LibraryGridProps) {
    const renderItem = useCallback(
        ({ item }: { item: LibraryItemData }) => (
            <View style={styles.itemWrapper}>
                <GridItem
                    item={item}
                    onPress={
                        onItemPress &&
                        (item.itemType === "song" || item.itemType === "video")
                            ? () =>
                                  onItemPress(item.originalItem, item.itemType)
                            : undefined
                    }
                />
            </View>
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback(
        (item: LibraryItemData, index: number) =>
            `${item.itemType}-${item.publicId}-${index}`,
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
