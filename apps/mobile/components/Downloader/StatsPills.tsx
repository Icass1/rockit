import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";

interface StatsPillsProps {
    total: number;
    active: number;
    done: number;
    failed: number;
}

interface PillProps {
    count: number;
    color: string;
    label: string;
}

function Pill({ count, color, label }: PillProps) {
    const styles = useThemedStyles(createStyles);
    if (count === 0) return null;
    return (
        <View style={[styles.pill, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.pillText, { color }]}>
                {count} {label}
            </Text>
        </View>
    );
}

export default function StatsPills({
    total,
    active,
    done,
    failed,
}: StatsPillsProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <Pill count={total} color={theme.legacy.white} label="total" />
            <Pill count={active} color={theme.legacy.accent} label="active" />
            <Pill count={done} color={theme.colors["success"]} label="done" />
            <Pill
                count={failed}
                color={theme.colors["destructive"]}
                label="failed"
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
        },
        pill: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: 14,
        },
        pillText: {
            fontSize: theme.typography.caption,
            fontWeight: "700",
        },
    });
