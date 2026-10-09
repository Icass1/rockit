import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function CollectionControls({
    pager,
}: {
    pager: CollectionPager;
}) {
    const state = useStore(pager.state);
    const { vocabulary } = useVocabulary();
    return (
        <View style={{ gap: 10, padding: 8 }}>
            <TextInput
                accessibilityLabel={vocabulary.SEARCH}
                placeholder={vocabulary.SEARCH}
                placeholderTextColor={COLORS.gray400}
                value={state.query}
                onChangeText={(query) => pager.search(query)}
                style={{
                    color: COLORS.white,
                    backgroundColor: COLORS.bgCard,
                    borderRadius: 8,
                    padding: 12,
                }}
            />
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.PREVIOUS_MEDIA}
                    disabled={state.loading || state.offset === 0}
                    onPress={() => void pager.previous()}
                    style={{
                        padding: 12,
                        opacity: state.offset === 0 ? 0.4 : 1,
                    }}
                >
                    <Text style={{ color: COLORS.white }}>←</Text>
                </Pressable>
                <Text style={{ color: COLORS.gray400 }}>
                    {state.total ? state.offset + 1 : 0}–
                    {Math.min(state.offset + state.media.length, state.total)} /{" "}
                    {state.total}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.NEXT_MEDIA}
                    disabled={state.loading || !state.hasMore}
                    onPress={() => void pager.next()}
                    style={{ padding: 12, opacity: state.hasMore ? 1 : 0.4 }}
                >
                    <Text style={{ color: COLORS.white }}>→</Text>
                </Pressable>
            </View>
            {state.loading && <ActivityIndicator color={COLORS.accent} />}
            {state.error && (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void pager.load(state.offset)}
                >
                    <Text style={{ color: COLORS.white }}>
                        {state.error} · {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
