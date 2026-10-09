import { useEffect } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function CollectionFooter({
    pager,
    visible = false,
}: {
    pager: CollectionPager;
    visible?: boolean;
}) {
    const state = useStore(pager.state);
    const { vocabulary } = useVocabulary();
    useEffect(() => {
        if (visible && state.hasMore && !state.loading && !state.error)
            void pager.next();
    }, [pager, visible, state.hasMore, state.loading, state.error]);
    return (
        <View
            accessibilityLiveRegion="polite"
            style={{
                minHeight: 48,
                padding: 12,
                gap: 8,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {state.loading && <ActivityIndicator color={COLORS.accent} />}
            <Text style={{ color: COLORS.gray400 }}>
                {state.media.length} / {state.total}
            </Text>
            {state.error && (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void pager.retry()}
                >
                    <Text style={{ color: COLORS.white }}>
                        {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
