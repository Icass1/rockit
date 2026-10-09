import { useContext, useEffect, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import { CollectionScrollContext } from "@/components/RenderList/CollectionScrollContext";

export default function CollectionFooter({
    pager,
}: {
    pager: CollectionPager;
}) {
    const state = useStore(pager.state);
    const { vocabulary } = useVocabulary();
    const scroll = useContext(CollectionScrollContext);
    const sentinel = useRef<View>(null);
    useEffect(() => {
        if (!scroll || !state.hasMore || state.loading || state.error) return;
        let active = true;
        const check = () => {
            scroll.viewport.current?.measureInWindow(
                (_x, top, _width, height) => {
                    sentinel.current?.measureInWindow((_sx, y, _sw, sh) => {
                        if (
                            active &&
                            height > 0 &&
                            y + sh > top &&
                            y < top + height + 100
                        )
                            void pager.next();
                    });
                }
            );
        };
        const unsubscribe = scroll.subscribe(check);
        const timer = setTimeout(check, 50);
        return () => {
            active = false;
            clearTimeout(timer);
            unsubscribe();
        };
    }, [
        pager,
        scroll,
        state.hasMore,
        state.loading,
        state.error,
        state.media.length,
    ]);
    return (
        <View
            ref={sentinel}
            collapsable={false}
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
