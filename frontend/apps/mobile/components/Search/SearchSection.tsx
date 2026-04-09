import { useCallback } from "react";
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

    const handlePress = useCallback(
        (item: BaseSearchResultsItem) => {
            router.push(item.url as any);
        },
        [router]
    );

    const renderGridItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <View style={styles.gridItem}>
                <MediaCard
                    imageUrl={item.imageUrl}
                    title={item.title}
                    subtitle={item.artists?.map((a) => a.name).join(", ")}
                    onPress={() => handlePress(item)}
                />
            </View>
        ),
        [handlePress]
    );

    const renderRowItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <MediaRow
                imageUrl={item.imageUrl}
                title={item.title}
                subtitle={item.artists?.map((a) => a.name).join(", ")}
                onPress={() => handlePress(item)}
            />
        ),
        [handlePress]
    );

    const renderArtistItem = useCallback(
        ({ item }: { item: BaseSearchResultsItem }) => (
            <View style={styles.artistItem}>
                <ArtistAvatar
                    imageUrl={item.imageUrl}
                    name={item.title}
                    onPress={() => handlePress(item)}
                />
            </View>
        ),
        [handlePress]
    );

    const renderItem =
        layout === "grid"
            ? renderGridItem
            : layout === "artist"
              ? renderArtistItem
              : renderRowItem;

    const keyExtractor = useCallback(
        (item: BaseSearchResultsItem) => item.url,
        []
    );

    if (items.length === 0) return null;

    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                numColumns={layout === "grid" ? 2 : 1}
                columnWrapperStyle={
                    layout === "grid" ? styles.gridRow : undefined
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                removeClippedSubviews={true}
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
