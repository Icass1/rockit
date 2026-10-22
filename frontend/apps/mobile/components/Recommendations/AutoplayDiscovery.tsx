import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import type {
    AutoplayRecommendation,
    BaseSearchResultsItem,
} from "@rockit/shared";
import { Image } from "expo-image";
import { Download, Play } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";

export function RecommendationRow({
    entry,
}: {
    entry: AutoplayRecommendation;
}) {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const media = entry.kind === "song" ? entry.song : entry.item;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${media.name}, ${media.artists.map((artist) => artist.name).join(", ")}, ${media.downloaded ? vocabulary.PLAY : vocabulary.CLICK_TO_DOWNLOAD}`}
            onPress={() => {
                void rockIt.queueManager.playAutoplayRecommendationAsync(entry);
            }}
            style={styles.row}
        >
            <Image
                source={media.imageUrl || PLACEHOLDER.song}
                style={styles.image}
                contentFit="cover"
            />
            <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>
                    {media.name}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                    {media.artists.map((artist) => artist.name).join(", ")}
                </Text>
            </View>
            {media.downloaded ? (
                <Play size={18} color={COLORS.accent} />
            ) : (
                <Download size={18} color={COLORS.gray400} />
            )}
        </Pressable>
    );
}

export default function AutoplayDiscovery({
    items,
}: {
    items: BaseSearchResultsItem[];
}) {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    if (items.length === 0) return null;
    return (
        <View>
            <Text style={styles.title}>{vocabulary.PLAYER_DISCOVER_TITLE}</Text>
            <FlatList
                horizontal
                data={items}
                keyExtractor={(item) => `${item.artists[0]?.name}:${item.name}`}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <RecommendationRow entry={{ kind: "discover", item }} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        minHeight: 66,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    image: {
        width: 46,
        height: 46,
        borderRadius: 6,
        backgroundColor: COLORS.bgCard,
    },
    copy: { flex: 1 },
    name: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
    artist: { color: COLORS.gray400, fontSize: 13, marginTop: 3 },
    title: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    card: { width: 300 },
});
