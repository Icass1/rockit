import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { Pressable, Text, TextInput, View } from "react-native";
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
            {state.error && (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void pager.retry()}
                >
                    <Text style={{ color: COLORS.white }}>
                        {state.error} · {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
