import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { StatsSummaryResponse } from "@rockit/shared";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

interface SummaryCardsProps {
    summary: StatsSummaryResponse;
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (num >= 10_000) {
        return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return num.toLocaleString();
}

function formatDuration(minutes: number): string {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = Math.round(minutes % 60);

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);

    return parts.join(" ");
}

interface CardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent?: boolean;
    onPress?: () => void;
}

function SummaryCard({ label, value, icon, accent, onPress }: CardProps) {
    return (
        <View
            style={[
                styles.card,
                accent ? styles.accentCard : styles.normalCard,
                onPress && styles.pressable,
            ]}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.label}>{label}</Text>
                <View>{icon}</View>
            </View>
            <Text style={styles.value} onPress={onPress}>
                {value}
            </Text>
        </View>
    );
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
    const { vocabulary } = useVocabulary();
    const { width } = useWindowDimensions();
    const numColumns = width > 500 ? 4 : 2;
    const [showMinutes, setShowMinutes] = useState(false);

    const minutesDisplay = showMinutes
        ? `${Math.round(summary.minutesListened).toLocaleString()} ${
              vocabulary.MINUTES || "min"
          }`
        : formatDuration(summary.minutesListened);

    const cards = [
        <SummaryCard
            key="songs"
            icon={<Feather name="music" size={16} color={COLORS.accent} />}
            label={vocabulary.SONGS_LISTENED || "Songs played"}
            value={formatNumber(summary.songsListened)}
            accent
        />,
        <SummaryCard
            key="minutes"
            icon={<Feather name="clock" size={16} color={COLORS.gray600} />}
            label={vocabulary.MINUTES_LISTEND || "Time listened"}
            value={minutesDisplay}
            onPress={() => setShowMinutes(!showMinutes)}
        />,
        <SummaryCard
            key="avg"
            icon={
                <Feather name="trending-up" size={16} color={COLORS.gray600} />
            }
            label={vocabulary.AVERAGE_MINUTES_PER_SONG || "Avg min / song"}
            value={summary.avgMinutesPerSong.toFixed(1)}
        />,
        <SummaryCard
            key="streak"
            icon={<Feather name="zap" size={16} color={COLORS.gray600} />}
            label={vocabulary.LEVEL_ABBR || "Day streak"}
            value={`${summary.currentStreak}d`}
        />,
    ];

    const rows: React.ReactNode[][] = [];
    for (let i = 0; i < cards.length; i += numColumns) {
        rows.push(cards.slice(i, i + numColumns));
    }

    return (
        <View style={styles.container}>
            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    card: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
    },
    pressable: {
        cursor: "pointer",
    },
    accentCard: {
        backgroundColor: "rgba(238,16,134,0.15)",
        borderWidth: 1,
        borderColor: "rgba(238,16,134,0.2)",
    },
    normalCard: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.8)",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    label: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.gray600,
        textTransform: "uppercase",
        letterSpacing: 1.5,
    },
    value: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ffffff",
    },
});
