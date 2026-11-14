import { useStore } from "@nanostores/react";
import { getRockitListName, type FeaturedCollectionKey } from "@rockit/shared";
import {
    ActionButton,
    FeaturedArtwork,
    MediaArtwork,
    useDesignTheme,
} from "@rockit/ui";
import { Pin, PinOff } from "@rockit/ui/icons";
import { FlatList, Pressable, Text, View } from "react-native";
import type { LibraryCollectionEntry } from "@/models/interfaces/libraryCollectionEntry";
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
    const manager = rockIt.navigationPinsManager;
    const pins = useStore(manager.pinsAtom);
    const status = useStore(manager.statusAtom);
    const entries: LibraryCollectionEntry[] = [
        ...keys.map((key) => ({
            id: key,
            builtinKey: key,
            pin: pins.find((pin) => pin.builtinKey === key),
        })),
        ...pins
            .filter((pin) => !pin.builtinKey)
            .map((pin) => ({ id: pin.publicId, pin })),
    ];
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
                style={{ flexGrow: 0, flexShrink: 0 }}
                data={entries}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.md }}
                keyExtractor={(entry) => entry.id}
                renderItem={({ item: entry }) => {
                    const key = entry.builtinKey;
                    const pin = entry.pin;
                    const name = key
                        ? getRockitListName(key, vocabulary)
                        : pin!.name;
                    return (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={name}
                            style={{
                                width: theme.layout.artistArtwork,
                                gap: theme.spacing.sm,
                            }}
                            onPress={() =>
                                router.push(key ? `/playlist/${key}` : pin!.url)
                            }
                            onLongPress={() =>
                                menu.show({
                                    title: name,
                                    options: [
                                        {
                                            label: pin
                                                ? vocabulary.NAV_UNPIN
                                                : vocabulary.NAV_PIN,
                                            icon: pin ? PinOff : Pin,
                                            onPress: () => {
                                                menu.hide();
                                                void rockIt.navigationPinsManager.setPinnedAsync(
                                                    pin?.publicId ?? entry.id,
                                                    !pin
                                                );
                                            },
                                        },
                                    ],
                                })
                            }
                        >
                            <View>
                                {key ? (
                                    <FeaturedArtwork kind={key} label={name} />
                                ) : (
                                    <MediaArtwork
                                        uri={pin!.imageUrl}
                                        label={name}
                                        size={theme.layout.artistArtwork}
                                        round={pin!.type === "artist"}
                                    />
                                )}
                                {!!pin && (
                                    <View
                                        pointerEvents="none"
                                        style={{
                                            position: "absolute",
                                            right: theme.spacing.xs,
                                            bottom: theme.spacing.xs,
                                            padding: theme.spacing.xs,
                                            borderRadius: theme.radius.full,
                                            backgroundColor:
                                                theme.colors.background,
                                        }}
                                    >
                                        <Pin
                                            size={theme.typography.caption}
                                            color={theme.colors.foreground}
                                        />
                                    </View>
                                )}
                            </View>
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
            {status === "error" && (
                <ActionButton
                    label={vocabulary.NAV_PINS_RETRY}
                    onPress={() => void manager.refreshAsync()}
                />
            )}
        </View>
    );
}
