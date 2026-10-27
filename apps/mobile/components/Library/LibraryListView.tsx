import { memo, useCallback } from "react";
import { TMedia } from "@rockit/shared";
import { FlatList, StyleSheet, View } from "react-native";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryListViewProps {
    items: TMedia[];
}

const ListItem = memo(function ListItem({ item }: { item: TMedia }) {
    return <MediaRow media={item} />;
});

export default function LibraryListView({ items }: LibraryListViewProps) {
    const renderItem = useCallback(
        ({ item }: { item: TMedia }) => <ListItem item={item} />,
        []
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
