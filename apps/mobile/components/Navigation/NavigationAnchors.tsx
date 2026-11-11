import { useStore } from "@nanostores/react";
import { getRockitListName } from "@rockit/shared";
import {
    ActionButton,
    FeaturedArtwork,
    MediaArtwork,
    useDesignTheme,
} from "@rockit/ui";
import { Pin, PinOff } from "@rockit/ui/icons";
import { FlatList, Pressable, Text, View } from "react-native";
import { useContextMenu } from "@/lib/ContextMenuContext";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

export default function NavigationAnchors() {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const { navigationPinsManager: manager } = usePlayerServices();
    const pins = useStore(manager.pinsAtom);
    const status = useStore(manager.statusAtom);
    const menu = useContextMenu();
    const router = useTypedRouter();
    if (!pins.length)
        return status === "error" ? (
            <ActionButton
                label={vocabulary.NAV_PINS_RETRY}
                onPress={() => void manager.refreshAsync()}
            />
        ) : null;
    return (
        <View
            style={{
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                paddingBottom: theme.spacing.lg,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                }}
            >
                <Pin
                    color={theme.colors["muted-foreground"]}
                    size={theme.typography.label}
                />
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {vocabulary.NAV_PINNED}
                </Text>
            </View>
            <FlatList
                horizontal
                data={pins}
                initialNumToRender={5}
                windowSize={3}
                keyExtractor={(pin) => pin.publicId}
                contentContainerStyle={{ gap: theme.spacing.lg }}
                renderItem={({ item: pin }) => {
                    const name = pin.builtinKey
                        ? getRockitListName(
                              pin.builtinKey,
                              vocabulary,
                              pin.name
                          )
                        : pin.name;
                    return (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={name}
                            onPress={() =>
                                router.push(
                                    pin.builtinKey
                                        ? `/playlist/${pin.builtinKey}`
                                        : pin.url
                                )
                            }
                            onLongPress={() =>
                                menu.show({
                                    title: name,
                                    imageUrl: pin.imageUrl ?? undefined,
                                    options: [
                                        {
                                            label: vocabulary.NAV_UNPIN,
                                            icon: PinOff,
                                            onPress: () => {
                                                menu.hide();
                                                void manager.setPinnedAsync(
                                                    pin.publicId,
                                                    false
                                                );
                                            },
                                        },
                                    ],
                                })
                            }
                            style={{
                                width: theme.layout.artistArtwork,
                                gap: theme.spacing.xs,
                            }}
                        >
                            {pin.builtinKey ? (
                                <FeaturedArtwork
                                    kind={pin.builtinKey}
                                    label={name}
                                />
                            ) : (
                                <MediaArtwork
                                    uri={pin.imageUrl}
                                    label={name}
                                    size={theme.layout.artistArtwork}
                                    round={pin.type === "artist"}
                                />
                            )}
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
