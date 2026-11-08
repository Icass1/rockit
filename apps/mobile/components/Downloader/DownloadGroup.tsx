import { useState } from "react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ChevronDown, ChevronRight, Trash2 } from "@rockit/ui/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DownloadGroup as DownloadGroupType } from "@/hooks/useDownloads";
import { useVocabulary } from "@/lib/vocabulary";
import DownloadItem from "@/components/Downloader/DownloadItem";

interface DownloadGroupProps {
    group: DownloadGroupType;
    onClear?: () => void;
}

export default function DownloadGroup({ group, onClear }: DownloadGroupProps) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
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
                    {isOpen ? (
                        <ChevronDown size={14} color={theme.legacy.gray600} />
                    ) : (
                        <ChevronRight size={14} color={theme.legacy.gray600} />
                    )}
                    <View
                        style={[styles.dot, { backgroundColor: group.color }]}
                    />
                    <Text style={styles.label}>{group.label}</Text>
                </View>
                <View style={styles.headerRight}>
                    {onClear && (
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            hitSlop={8}
                        >
                            <Trash2 size={14} color={theme.legacy.white} />
                        </Pressable>
                    )}
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
                        <Text style={styles.avgText}>
                            {avgProgress}
                            {vocabulary.MOBILE_DOWNLOAD_AVERAGE}
                        </Text>
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.5),
            backgroundColor: withAlpha(theme.colors["secondary"], 0.7),
            overflow: "hidden",
            marginBottom: theme.spacing.sm,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
        },
        headerPressed: {
            backgroundColor: withAlpha(theme.colors["foreground-strong"], 0.03),
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
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.white,
        },
        headerRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        badge: {
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 2,
            borderRadius: 10,
        },
        badgeText: {
            fontSize: 11,
            fontWeight: "700",
        },
        avgText: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
        },
        items: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: withAlpha(theme.colors["surface-raised"], 0.4),
        },
    });
