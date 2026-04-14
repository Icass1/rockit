import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import type { PlayerTab } from "./FullPlayer";

const TABS: {
    key: Exclude<PlayerTab, null | "crossfade">;
    label: string;
    icon: keyof typeof Feather.glyphMap;
}[] = [
    { key: "queue", label: "Queue", icon: "list" },
    { key: "lyrics", label: "Lyrics", icon: "file-text" },
    { key: "related", label: "Related", icon: "users" },
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
        <View
            style={[styles.container, { paddingBottom: insetBottom + 10 }]}
        >
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
                        <Feather
                            name={tab.icon}
                            size={20}
                            color={
                                isActive
                                    ? COLORS.accent
                                    : "rgba(255,255,255,0.5)"
                            }
                        />
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
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.1)",
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
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.5)",
    },
    tabLabelActive: {
        color: COLORS.accent,
    },
});
