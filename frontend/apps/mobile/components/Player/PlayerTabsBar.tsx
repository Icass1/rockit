import { COLORS } from "@/constants/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerTab } from "./FullPlayer";

const TABS: {
    key: Exclude<PlayerTab, null | "crossfade">;
    label: string;
}[] = [
    { key: "queue", label: "Queue" },
    { key: "lyrics", label: "Lyrics" },
    { key: "related", label: "Related" },
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
    return (
        <View style={[styles.container, { paddingBottom: insetBottom }]}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <Pressable
                        key={tab.key}
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
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    tabButton: {
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 10,
        gap: 4,
    },
    tabButtonActive: {
        backgroundColor: "rgba(238, 16, 134, 0.15)",
    },
    tabLabel: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.white,
    },
    tabLabelActive: {
        color: COLORS.accent,
    },
});
