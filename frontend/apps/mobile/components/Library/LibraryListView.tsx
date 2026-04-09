import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryItemData {
    publicId: string;
    name: string;
    imageUrl: string;
    subtitle?: string;
    href?: string;
    onPress?: () => void;
}

interface LibraryListViewProps {
    items: LibraryItemData[];
}

export default function LibraryListView({ items }: LibraryListViewProps) {
    const renderItem = useCallback(
        ({ item }: { item: LibraryItemData }) => (
            <MediaRow
                imageUrl={item.imageUrl}
                title={item.name}
                subtitle={item.subtitle}
                href={item.href}
                onPress={item.onPress}
            />
        ),
        []
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.publicId}
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
    },
});
