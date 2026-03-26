import type { BaseSearchResultsItem } from "@rockit/shared";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import SectionTitle from "@/components/layout/SectionTitle";
import ArtistAvatar from "@/components/Media/ArtistAvatar";
import MediaCard from "@/components/Media/MediaCard";
import MediaRow from "@/components/Media/MediaRow";

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

    function renderGridItem({ item }: { item: BaseSearchResultsItem }) {
        return (
            <View style={styles.gridItem}>
                <MediaCard
                    imageUrl={item.imageUrl}
                    title={item.title}
                    subtitle={item.artists?.map((a) => a.name).join(", ")}
                    onPress={() => handlePress(item)}
                />
            </View>
        );
    }

    function renderRowItem({ item }: { item: BaseSearchResultsItem }) {
        return (
            <MediaRow
                imageUrl={item.imageUrl}
                title={item.title}
                subtitle={item.artists?.map((a) => a.name).join(", ")}
                onPress={() => handlePress(item)}
            />
        );
    }

    function renderArtistItem({ item }: { item: BaseSearchResultsItem }) {
        return (
            <View style={styles.artistItem}>
                <ArtistAvatar
                    imageUrl={item.imageUrl}
                    name={item.title}
                    onPress={() => handlePress(item)}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            <FlatList
                data={items}
                keyExtractor={(item) => item.url}
                renderItem={
                    layout === "grid"
                        ? renderGridItem
                        : layout === "artist"
                          ? renderArtistItem
                          : renderRowItem
                }
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
    gridItem: {
        flex: 1,
        margin: 4,
        maxWidth: "50%",
    },
    gridRow: {
        justifyContent: "flex-start",
    },
    artistItem: {
        alignItems: "center",
        width: 100,
        marginHorizontal: 8,
    },
});
