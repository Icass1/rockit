import { memo, useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import MediaRow from "@/components/Media/MediaRow";

type ItemType = "album" | "playlist" | "song" | "video";

interface LibraryItemData {
    publicId: string;
    name: string;
    imageUrl: string;
    subtitle?: string;
    href?: string;
    originalItem: any;
    itemType: ItemType;
}

interface LibraryListViewProps {
    items: LibraryItemData[];
    onItemPress?: (item: any, itemType: ItemType) => void;
}

const ListItem = memo(function ListItem({
    item,
    onPress,
}: {
    item: LibraryItemData;
    onPress?: () => void;
}) {
    return (
        <MediaRow
            imageUrl={item.imageUrl}
            title={item.name}
            subtitle={item.subtitle}
            href={item.href}
            onPress={onPress}
        />
    );
});

export default function LibraryListView({
    items,
    onItemPress,
}: LibraryListViewProps) {
    const renderItem = useCallback(
        ({ item }: { item: LibraryItemData }) => (
            <ListItem
                item={item}
                onPress={
                    onItemPress &&
                    (item.itemType === "song" || item.itemType === "video")
                        ? () => onItemPress(item.originalItem, item.itemType)
                        : undefined
                }
            />
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback(
        (item: LibraryItemData, index: number) =>
            `${item.itemType}-${item.publicId}-${index}`,
        []
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
});
