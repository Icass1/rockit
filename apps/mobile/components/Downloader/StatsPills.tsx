import { COLORS } from "@/constants/theme";
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
    return (
        <View style={styles.container}>
            <Pill count={total} color={COLORS.white} label="total" />
            <Pill count={active} color={COLORS.accent} label="active" />
            <Pill count={done} color="#1cad60" label="done" />
            <Pill count={failed} color="#c72e2e" label="failed" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
    },
    pillText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
