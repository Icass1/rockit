import { COLORS } from "@/constants/theme";
import type { StatsRankedItemResponse } from "@rockit/shared";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

interface RankingListProps {
    items: StatsRankedItemResponse[];
    showImages?: boolean;
    valueLabel?: string;
    maxItems?: number;
}

export default function RankingList({
    items,
    showImages = false,
    valueLabel = "",
    maxItems,
}: RankingListProps) {
    const router = useRouter();

    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const displayItems = maxItems
        ? sortedItems.slice(0, maxItems)
        : sortedItems;
    const maxValue = displayItems[0]?.value || 1;

    const renderItem = ({
        item,
        index,
    }: {
        item: StatsRankedItemResponse;
        index: number;
    }) => (
        <Pressable
            style={styles.row}
            onPress={() => router.push(item.href as any)}
        >
            <Text style={styles.rank}>{index + 1}</Text>
            {showImages && item.imageUrl && (
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                />
            )}
            <Text style={styles.name} numberOfLines={1}>
                {item.name}
            </Text>
            <View style={styles.progressContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${(item.value / maxValue) * 100}%` },
                    ]}
                />
            </View>
            <Text style={styles.value}>
                {item.value}
                {valueLabel}
            </Text>
        </Pressable>
    );

    return (
        <FlatList
            data={displayItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.publicId}
            scrollEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            getItemLayout={(_, index) => ({
                length: 44,
                offset: 44 * index,
                index,
            })}
        />
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        height: 44,
        paddingHorizontal: 4,
    },
    rank: {
        width: 20,
        fontSize: 12,
        color: COLORS.gray600,
        textAlign: "right",
        marginRight: 8,
    },
    image: {
        width: 32,
        height: 32,
        borderRadius: 4,
        marginRight: 8,
        backgroundColor: COLORS.bgCard,
    },
    name: {
        flex: 1,
        fontSize: 14,
        color: "#ffffff",
        marginRight: 8,
    },
    progressContainer: {
        width: "40%",
        height: 6,
        backgroundColor: "rgba(38,38,38,0.5)",
        borderRadius: 3,
        marginRight: 8,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: COLORS.accent,
        borderRadius: 3,
    },
    value: {
        width: 32,
        fontSize: 12,
        color: COLORS.gray600,
        textAlign: "right",
    },
});
