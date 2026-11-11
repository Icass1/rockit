import { getRockitListName, type FeaturedCollectionKey } from "@rockit/shared";
import { FeaturedArtwork, useDesignTheme } from "@rockit/ui";
import { Pin } from "@rockit/ui/icons";
import { FlatList, Pressable, Text, View } from "react-native";
import { useContextMenu } from "@/lib/ContextMenuContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

const keys: FeaturedCollectionKey[] = [
    "liked",
    "most-listened",
    "recent-mix",
    "latest-downloads",
    "year-recap",
    "last-month",
];
export default function FeaturedCollections() {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const router = useTypedRouter();
    const menu = useContextMenu();
    return (
        <View
            style={{ paddingVertical: theme.spacing.lg, gap: theme.spacing.md }}
        >
            <Text
                style={{
                    color: theme.colors.foreground,
                    fontSize: theme.typography.label,
                    fontWeight: "600",
                }}
            >
                {vocabulary.FEATURED_LISTS}
            </Text>
            <FlatList
                horizontal
                data={keys}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.md }}
                keyExtractor={(key) => key}
                renderItem={({ item: key }) => {
                    const name = getRockitListName(key, vocabulary);
                    return (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={name}
                            style={{
                                width: theme.layout.artistArtwork,
                                gap: theme.spacing.sm,
                            }}
                            onPress={() => router.push(`/playlist/${key}`)}
                            onLongPress={() =>
                                menu.show({
                                    title: name,
                                    options: [
                                        {
                                            label: vocabulary.NAV_PIN,
                                            icon: Pin,
                                            onPress: () => {
                                                menu.hide();
                                                void rockIt.navigationPinsManager.setPinnedAsync(
                                                    key,
                                                    true
                                                );
                                            },
                                        },
                                    ],
                                })
                            }
                        >
                            <FeaturedArtwork kind={key} label={name} />
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: theme.colors.foreground,
                                    fontSize: theme.typography.caption,
                                }}
                            >
                                {name}
                            </Text>
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}
