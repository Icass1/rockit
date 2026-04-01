import { StyleSheet, View } from "react-native";
import MediaCard from "@/components/Media/MediaCard";

interface LibraryItemData {
    publicId: string;
    name: string;
    imageUrl?: string | null;
    subtitle?: string;
    href: string;
}

interface LibraryGridProps {
    items: LibraryItemData[];
}

export default function LibraryGrid({ items }: LibraryGridProps) {
    return (
        <View style={styles.container}>
            {items.map((item, index) => (
                <View
                    key={item.publicId}
                    style={[
                        styles.gridItem,
                        index % 2 === 0 ? styles.leftItem : styles.rightItem,
                    ]}
                >
                    <MediaCard
                        imageUrl={item.imageUrl}
                        title={item.name}
                        subtitle={item.subtitle}
                        href={item.href}
                    />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 16,
    },
    gridItem: {
        width: "50%",
        padding: 4,
    },
    leftItem: {
        paddingRight: 2,
    },
    rightItem: {
        paddingLeft: 2,
    },
});
