import { PLACEHOLDER } from "@/constants/assets";
import { useStore } from "@nanostores/react";
import {
    getMediaArtistsString,
    type AutoplayRecommendation,
    type BaseSearchResultsItem,
} from "@rockit/shared";
import {
    ResolvedMediaArtwork,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Download, ListPlus } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";

export function RecommendationRow({
    entry,
}: {
    entry: AutoplayRecommendation;
}) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const media = entry.kind === "song" ? entry.song : entry.item;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${media.name}, ${getMediaArtistsString(media) || vocabulary.UNKNOWN}, ${media.downloaded ? vocabulary.PLAY_NEXT : vocabulary.CLICK_TO_DOWNLOAD}`}
            onPress={() => {
                void rockIt.queueManager.playAutoplayRecommendationAsync(entry);
            }}
            style={styles.row}
        >
            <ResolvedMediaArtwork
                resolver={rockIt.recommendationArtworkManager}
                uri={media.imageUrl}
                provider={media.provider}
                artist={getMediaArtistsString(media)}
                track={media.name}
            />
            <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>
                    {media.name}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                    {getMediaArtistsString(media) || vocabulary.UNKNOWN}
                </Text>
            </View>
            {media.downloaded ? (
                <ListPlus size={18} color={theme.legacy.accent} />
            ) : (
                <Download size={18} color={theme.legacy.gray400} />
            )}
        </Pressable>
    );
}

export default function AutoplayDiscovery({
    items,
}: {
    items: BaseSearchResultsItem[];
}) {
    const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        row: {
            minHeight: 66,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
        },
        image: {
            width: 46,
            height: 46,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCard,
        },
        copy: { flex: 1 },
        name: { color: theme.legacy.white, fontSize: 15, fontWeight: "600" },
        artist: { color: theme.legacy.gray400, fontSize: 13, marginTop: 3 },
        title: {
            color: theme.legacy.white,
            fontSize: 20,
            fontWeight: "700",
            paddingHorizontal: 20,
            marginBottom: theme.spacing.md,
        },
        card: { width: 300 },
    });
