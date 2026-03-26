import { FlatList, StyleSheet, View } from "react-native";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryItemData {
    publicId: string;
    name: string;
    imageUrl?: string | null;
    subtitle?: string;
    href: string;
}

interface LibraryListViewProps {
    items: LibraryItemData[];
}

export default function LibraryListView({ items }: LibraryListViewProps) {
    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.publicId}
                renderItem={({ item }) => (
                    <MediaRow
                        imageUrl={item.imageUrl}
                        title={item.name}
                        subtitle={item.subtitle}
                        href={item.href}
                    />
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
