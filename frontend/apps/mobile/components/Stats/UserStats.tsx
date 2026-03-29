import { COLORS } from "@/constants/theme";
import type { UserStatsResponse } from "@rockit/shared";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import AlbumGrid from "./charts/AlbumGrid";
import ListeningHeatmap from "./charts/ListeningHeatmap";
import MinutesBarChart from "./charts/MinutesBarChart";
import RankingList from "./charts/RankingList";
import StatsSectionCard from "./StatsSectionCard";
import SummaryCards from "./SummaryCards";

interface UserStatsProps {
    data: UserStatsResponse;
    rangeLabel: string;
}

export default function UserStats({ data, rangeLabel }: UserStatsProps) {
    const { vocabulary } = useVocabulary();
    const { width } = useWindowDimensions();
    const isWide = width > 600;

    return (
        <View style={styles.container}>
            <SummaryCards summary={data.summary} />

            <StatsSectionCard
                title={`${vocabulary.MINUTES_LISTENED || "Minutes listened"} — ${rangeLabel}`}
            >
                <MinutesBarChart data={data.minutes} />
            </StatsSectionCard>

            <View style={isWide ? styles.row : styles.column}>
                <View style={styles.flex1}>
                    <StatsSectionCard
                        title={vocabulary.TOP_SONGS || "Top songs"}
                    >
                        <RankingList
                            items={data.topSongs}
                            showImages
                            maxItems={10}
                        />
                    </StatsSectionCard>
                </View>
                <View style={styles.flex1}>
                    <StatsSectionCard
                        title={
                            vocabulary.MOST_LISTENED_ARTISTS || "Top artists"
                        }
                    >
                        <RankingList
                            items={data.topArtists}
                            showImages
                            valueLabel="%"
                            maxItems={8}
                        />
                    </StatsSectionCard>
                </View>
            </View>

            <StatsSectionCard title={vocabulary.TOP_ALBUMS || "Top albums"}>
                <AlbumGrid albums={data.topAlbums} />
            </StatsSectionCard>

            <StatsSectionCard
                title={
                    vocabulary.MINUTES_LISTENED_PER_DAY || "Listening heatmap"
                }
            >
                <ListeningHeatmap data={data.heatmap} />
                <Text style={styles.hint}>
                    {vocabulary.MINUTES_LISTENED_PER_DAY ||
                        "Darker cells = more minutes listened at that hour"}
                </Text>
            </StatsSectionCard>
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
    column: {
        flexDirection: "column",
        gap: 12,
    },
    flex1: {
        flex: 1,
    },
    hint: {
        fontSize: 10,
        color: COLORS.gray600,
        marginTop: 8,
    },
});
