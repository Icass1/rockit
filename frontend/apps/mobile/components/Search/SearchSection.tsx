import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import SectionTitle from "@/components/layout/SectionTitle";

type ItemLayout = "row" | "grid" | "artist";

interface SearchSectionProps {
    title: string;
    items: BaseSearchResultsItem[];
    layout?: ItemLayout;
}

export default function SearchSection({
    title,
    items,
    layout = "row",
}: SearchSectionProps) {
    const router = useRouter();

    if (items.length === 0) return null;

    function handlePress(item: BaseSearchResultsItem) {
        router.push(item.url as any);
    }

    const renderItem = ({ item }: { item: BaseSearchResultsItem }) => (
        <Pressable
            style={({ pressed }) => [
                styles.itemWrapper,
                layout === "row" && styles.rowItem,
                layout === "grid" && styles.gridItem,
                layout === "artist" && styles.artistItem,
                pressed && styles.itemPressed,
            ]}
            onPress={() => handlePress(item)}
        >
            <Image
                source={item.imageUrl || PLACEHOLDER.song}
                style={
                    layout === "row"
                        ? styles.rowImage
                        : layout === "grid"
                          ? styles.gridImage
                          : styles.artistImage
                }
                contentFit="cover"
            />
            <View
                style={
                    layout === "row"
                        ? styles.itemInfo
                        : layout === "grid"
                          ? styles.gridInfo
                          : styles.artistInfo
                }
            >
                <Text
                    style={styles.itemTitle}
                    numberOfLines={layout === "row" ? 1 : 2}
                >
                    {item.title}
                </Text>
                {layout === "row" && (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {item.artists?.map((a) => a.name).join(", ")}
                    </Text>
                )}
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            <FlatList
                data={items}
                keyExtractor={(item) => item.url}
                renderItem={renderItem}
                scrollEnabled={false}
                numColumns={layout === "grid" ? 2 : 1}
                columnWrapperStyle={
                    layout === "grid" ? styles.gridRow : undefined
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    itemWrapper: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowItem: {
        flex: 1,
    },
    rowImage: {
        width: 48,
        height: 48,
        borderRadius: 4,
    },
    itemInfo: {
        marginLeft: 12,
        flex: 1,
    },
    gridInfo: {
        marginTop: 6,
    },
    artistInfo: {
        marginTop: 6,
        alignItems: "center",
    },
    itemTitle: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "500",
    },
    itemSubtitle: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
    },
    itemPressed: {
        opacity: 0.7,
    },
    gridItem: {
        flex: 1,
        margin: 4,
        maxWidth: "50%",
        alignItems: "flex-start",
    },
    gridImage: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 8,
    },
    artistItem: {
        alignItems: "center",
        width: 100,
    },
    artistImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    gridRow: {
        justifyContent: "flex-start",
    },
});
