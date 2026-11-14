import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { useDesignTheme } from "@rockit/ui";
import { Pressable, Text, TextInput, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function CollectionControls({
    pager,
    showSearch = true,
}: {
    pager: CollectionPager;
    showSearch?: boolean;
}) {
    const theme = useDesignTheme();
    const state = useStore(pager.state);
    const { vocabulary } = useVocabulary();
    return (
        <View
            style={{
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.sm,
            }}
        >
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
                            borderRadius: theme.radius.full,
                            minHeight: theme.layout.touchTarget,
                            fontSize: theme.typography.body,
                            paddingHorizontal: theme.spacing.lg,
                            paddingVertical: theme.spacing.sm,
                        }}
                    />
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
