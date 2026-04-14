import { memo, useCallback } from "react";
import { isQueueable, TMedia, TQueueMedia } from "@rockit/shared";
import { FlatList, StyleSheet, View } from "react-native";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryListViewProps {
    items: TMedia[];
    onItemPress?: (item: TQueueMedia) => void;
}

const ListItem = memo(function ListItem({
    item,
    onPress,
}: {
    item: TMedia;
    onPress?: () => void;
}) {
    return <MediaRow media={item} onPress={onPress} />;
});

export default function LibraryListView({
    items,
    onItemPress,
}: LibraryListViewProps) {
    const renderItem = useCallback(
        ({ item }: { item: TMedia }) => (
            <ListItem
                item={item}
                onPress={
                    onItemPress && isQueueable(item)
                        ? () => onItemPress(item)
                        : undefined
                }
            />
        ),
        [onItemPress]
    );

    const keyExtractor = useCallback(
        (item: TMedia, index: number) =>
            `${item.type}-${item.publicId}-${index}`,
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
