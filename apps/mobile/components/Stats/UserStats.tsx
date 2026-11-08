import type { UserStatsResponse } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import ListeningHeatmap from "@/components/Stats/charts/ListeningHeatmap";
import MinutesBarChart from "@/components/Stats/charts/MinutesBarChart";
import RankingList from "@/components/Stats/charts/RankingList";
import StatsSectionCard from "@/components/Stats/StatsSectionCard";
import SummaryCards from "@/components/Stats/SummaryCards";

interface UserStatsProps {
    data: UserStatsResponse;
    rangeLabel: string;
}

export default function UserStats({ data, rangeLabel }: UserStatsProps) {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const { width } = useWindowDimensions();
    const isWide = width > 600;

    return (
        <View style={styles.container}>
            <SummaryCards summary={data.summary} />

            <StatsSectionCard
                title={`${vocabulary.MINUTES_LISTEND} — ${rangeLabel}`}
            >
                <MinutesBarChart data={data.minutes} />
            </StatsSectionCard>

            <View style={isWide ? styles.row : styles.column}>
                <View style={styles.flex1}>
                    <StatsSectionCard title={vocabulary.TOP_SONGS}>
                        <RankingList
                            items={data.topSongs}
                            showImages
                            maxItems={3}
                        />
                    </StatsSectionCard>
                </View>
                <View style={styles.flex1}>
                    <StatsSectionCard title={vocabulary.MOST_LISTENED_ARTISTS}>
                        <RankingList
                            items={data.topArtists}
                            showImages
                            maxItems={3}
                        />
                    </StatsSectionCard>
                </View>
            </View>

            <View style={isWide ? styles.row : styles.column}>
                <View style={styles.flex1}>
                    <StatsSectionCard title={vocabulary.TOP_VIDEOS}>
                        <RankingList
                            items={data.topVideos}
                            showImages
                            maxItems={3}
                        />
                    </StatsSectionCard>
                </View>
                <View style={styles.flex1}>
                    <StatsSectionCard title={vocabulary.TOP_ALBUMS}>
                        <RankingList
                            items={data.topAlbums}
                            showImages
                            maxItems={3}
                        />
                    </StatsSectionCard>
                </View>
            </View>

            <StatsSectionCard title={vocabulary.MINUTES_LISTENED_PER_DAY}>
                <ListeningHeatmap data={data.heatmap} />
                <Text style={styles.hint}>
                    {vocabulary.MINUTES_LISTENED_PER_DAY}
                </Text>
            </StatsSectionCard>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            gap: theme.spacing.md,
        },
        row: {
            flexDirection: "row",
            gap: theme.spacing.md,
        },
        column: {
            flexDirection: "column",
            gap: theme.spacing.md,
        },
        flex1: {
            flex: 1,
        },
        hint: {
            fontSize: 10,
            color: theme.legacy.gray600,
            marginTop: theme.spacing.sm,
        },
    });
