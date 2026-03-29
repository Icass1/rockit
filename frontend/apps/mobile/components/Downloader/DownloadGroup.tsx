import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DownloadGroup as DownloadGroupType } from "@/hooks/useDownloads";
import DownloadItem from "./DownloadItem";

interface DownloadGroupProps {
    group: DownloadGroupType;
}

export default function DownloadGroup({ group }: DownloadGroupProps) {
    const [isOpen, setIsOpen] = useState(group.isOpen);

    if (group.items.length === 0) return null;

    const avgProgress =
        group.id === "active"
            ? Math.round(
                  group.items.reduce((s, i) => s + i.completed, 0) /
                      group.items.length
              )
            : null;

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.header,
                    pressed && styles.headerPressed,
                ]}
                onPress={() => setIsOpen(!isOpen)}
            >
                <View style={styles.headerLeft}>
                    <Feather
                        name={isOpen ? "chevron-down" : "chevron-right"}
                        size={14}
                        color={COLORS.gray600}
                    />
                    <View
                        style={[styles.dot, { backgroundColor: group.color }]}
                    />
                    <Text style={styles.label}>{group.label}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View
                        style={[
                            styles.badge,
                            { backgroundColor: group.badgeColor },
                        ]}
                    >
                        <Text
                            style={[styles.badgeText, { color: group.color }]}
                        >
                            {group.items.length}
                        </Text>
                    </View>
                    {avgProgress !== null && (
                        <Text style={styles.avgText}>{avgProgress}% avg</Text>
                    )}
                </View>
            </Pressable>
            {isOpen && (
                <View style={styles.items}>
                    {group.items.map((item, index) => (
                        <DownloadItem
                            key={`${item.publicId}-${index}`}
                            item={item}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(38, 38, 38, 0.5)",
        backgroundColor: "rgba(26, 26, 26, 0.7)",
        overflow: "hidden",
        marginBottom: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerPressed: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    avgText: {
        fontSize: 12,
        color: COLORS.gray600,
    },
    items: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(38, 38, 38, 0.4)",
    },
});
