import { useState } from "react";
import type { StatsSummaryResponse, Vocabulary } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Clock, Music, TrendingUp, Zap } from "@rockit/ui/icons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

interface SummaryCardsProps {
    summary: StatsSummaryResponse;
}

function formatNumber(num: number, lang: string): string {
    return new Intl.NumberFormat(lang, {
        notation: num >= 10_000 ? "compact" : "standard",
        maximumFractionDigits: 1,
    }).format(num);
}

function formatDuration(minutes: number, v: Vocabulary, lang: string): string {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = Math.round(minutes % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(v.TIME_DAYS.replace("{n}", d.toLocaleString(lang)));
    if (h > 0) parts.push(v.TIME_HOURS.replace("{n}", h.toLocaleString(lang)));
    if (m > 0 || parts.length === 0)
        parts.push(v.TIME_MINUTES.replace("{n}", m.toLocaleString(lang)));
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
    const styles = useThemedStyles(createStyles);
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
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary, lang } = useVocabulary();
    const { width } = useWindowDimensions();
    const numColumns = width > 500 ? 4 : 2;
    const [showMinutes, setShowMinutes] = useState(false);

    const roundedMinutes = Math.round(summary.minutesListened);
    const minutesDisplay = showMinutes
        ? (roundedMinutes === 1
              ? vocabulary.STATS_MINUTES_COUNT_ONE
              : vocabulary.STATS_MINUTES_COUNT_OTHER
          ).replace("{count}", roundedMinutes.toLocaleString(lang))
        : formatDuration(summary.minutesListened, vocabulary, lang);

    const cards = [
        <SummaryCard
            key="songs"
            icon={<Music size={16} color={theme.legacy.accent} />}
            label={vocabulary.SONGS_LISTENED}
            value={formatNumber(summary.songsListened, lang)}
            accent
        />,
        <SummaryCard
            key="minutes"
            icon={<Clock size={16} color={theme.legacy.gray600} />}
            label={vocabulary.MINUTES_LISTEND}
            value={minutesDisplay}
            onPress={() => setShowMinutes(!showMinutes)}
        />,
        <SummaryCard
            key="avg"
            icon={<TrendingUp size={16} color={theme.legacy.gray600} />}
            label={vocabulary.AVERAGE_MINUTES_PER_SONG}
            value={new Intl.NumberFormat(lang, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }).format(summary.avgMinutesPerSong)}
        />,
        <SummaryCard
            key="streak"
            icon={<Zap size={16} color={theme.legacy.gray600} />}
            label={vocabulary.SOCIAL_STREAK}
            value={vocabulary.TIME_DAYS.replace(
                "{n}",
                summary.currentStreak.toLocaleString(lang)
            )}
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            minWidth: 0,
            maxWidth: "100%",
            gap: theme.spacing.md,
        },
        row: {
            flexDirection: "row",
            gap: theme.spacing.md,
        },
        card: {
            minWidth: 0,
            flex: 1,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.md,
        },
        pressable: {
            cursor: "pointer",
        },
        accentCard: {
            backgroundColor: withAlpha(theme.colors["primary"], 0.15),
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["primary"], 0.2),
        },
        normalCard: {
            backgroundColor: theme.legacy.bgCard,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.8),
        },
        cardHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: theme.spacing.sm,
        },
        label: {
            fontSize: 10,
            fontWeight: "600",
            color: theme.legacy.gray600,
            textTransform: "uppercase",
            letterSpacing: 1.5,
        },
        value: {
            fontSize: 22,
            fontWeight: "bold",
            color: theme.colors["foreground-strong"],
        },
    });
