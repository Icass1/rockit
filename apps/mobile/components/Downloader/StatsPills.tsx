import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

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
        <View
            style={[styles.pill, { backgroundColor: withAlpha(color, 0.08) }]}
        >
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
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <Pill
                count={total}
                color={theme.legacy.white}
                label={vocabulary.SONGS}
            />
            <Pill
                count={active}
                color={theme.legacy.accent}
                label={vocabulary.ACTIVE}
            />
            <Pill
                count={done}
                color={theme.colors["success"]}
                label={vocabulary.COMPLETED}
            />
            <Pill
                count={failed}
                color={theme.colors["destructive"]}
                label={vocabulary.FAILED}
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
