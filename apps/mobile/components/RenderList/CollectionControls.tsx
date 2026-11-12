import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { IconButton, useDesignTheme } from "@rockit/ui";
import { Play } from "@rockit/ui/icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function CollectionControls({
    pager,
    showSearch = true,
    onPlay,
}: {
    pager: CollectionPager;
    showSearch?: boolean;
    onPlay?: () => void;
}) {
    const theme = useDesignTheme();
    const state = useStore(pager.state);
    const { vocabulary } = useVocabulary();
    return (
        <View style={{ gap: 10, padding: 8 }}>
            {showSearch && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                    }}
                >
                    <TextInput
                        accessibilityLabel={vocabulary.SEARCH}
                        placeholder={vocabulary.SEARCH}
                        placeholderTextColor={theme.legacy.gray400}
                        value={state.query}
                        onChangeText={(query) => pager.search(query)}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            color: theme.legacy.white,
                            backgroundColor: theme.legacy.bgCard,
                            borderRadius: 8,
                            padding: 12,
                        }}
                    />
                    {onPlay && (
                        <IconButton label={vocabulary.PLAY} onPress={onPlay}>
                            <Play
                                size={theme.typography.title}
                                color={theme.colors.foreground}
                                fill={theme.colors.foreground}
                            />
                        </IconButton>
                    )}
                </View>
            )}
            {state.error && (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void pager.retry()}
                >
                    <Text style={{ color: theme.legacy.white }}>
                        {state.error} · {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
