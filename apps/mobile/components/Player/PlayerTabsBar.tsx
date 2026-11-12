import type { Vocabulary } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import type { PlayerTab } from "@/components/Player/FullPlayer";

const TABS: {
    key: Exclude<PlayerTab, null | "crossfade">;
    label: keyof Vocabulary;
}[] = [
    { key: "queue", label: "QUEUE" },
    { key: "lyrics", label: "LYRICS" },
    { key: "related", label: "MOBILE_PLAYER_RELATED" },
];

interface PlayerTabsBarProps {
    activeTab: PlayerTab;
    onTabPress: (tab: PlayerTab) => void;
    insetBottom: number;
}

export default function PlayerTabsBar({
    activeTab,
    onTabPress,
    insetBottom,
}: PlayerTabsBarProps) {
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={[styles.container, { paddingBottom: insetBottom }]}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <Pressable
                        key={tab.key}
                        accessibilityRole="button"
                        accessibilityLabel={vocabulary[tab.label]}
                        accessibilityState={{ selected: isActive }}
                        style={[
                            styles.tabButton,
                            isActive && styles.tabButtonActive,
                        ]}
                        onPress={() => onTabPress(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabLabel,
                                isActive && styles.tabLabelActive,
                            ]}
                        >
                            {vocabulary[tab.label]}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            justifyContent: "space-around",
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.xl,
        },
        tabButton: {
            flex: 1,
            minHeight: theme.layout.touchTarget,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.md,
            gap: theme.spacing.xs,
        },
        tabButtonActive: {
            backgroundColor: withAlpha(theme.colors["primary"], 0.15),
        },
        tabLabel: {
            fontSize: theme.typography.subtitle,
            fontWeight: "600",
            color: theme.colors["muted-foreground"],
        },
        tabLabelActive: {
            color: theme.legacy.accent,
        },
    });
