import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import {
    API_ENDPOINTS,
    BaseSongWithAlbumResponse,
    getPreviousMonthKey,
    HomeStatsResponseSchema,
} from "@rockit/shared";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useApiFetch } from "@/lib/useApiFetch";
import Header from "@/components/layout/Header";

interface SongCardProps {
    song: BaseSongWithAlbumResponse;
}

function SongCard({ song }: SongCardProps) {
    const artistNames = song.artists.map((a) => a.name).join(", ");
    return (
        <View style={styles.songCard}>
            <Image
                source={song.imageUrl || PLACEHOLDER.song}
                style={styles.songImage}
                contentFit="cover"
            />
            <Text style={styles.songName} numberOfLines={1}>
                {song.name}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
                {artistNames}
            </Text>
        </View>
    );
}

interface SectionProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
}

function SongSection({ title, songs }: SectionProps) {
    if (songs.length === 0) return null;
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <FlatList
                horizontal
                data={songs}
                keyExtractor={(item) => item.publicId}
                renderItem={({ item }) => <SongCard song={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.songListContent}
            />
        </View>
    );
}

export default function HomeScreen() {
    const { data, loading, error } = useApiFetch(
        API_ENDPOINTS.homeStats,
        HomeStatsResponseSchema
    );

    if (loading) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            </>
        );
    }

    if (error || !data) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>
                        {error ?? "Failed to load"}
                    </Text>
                </View>
            </>
        );
    }

    const hasContent =
        data.songsByTimePlayed.length > 0 ||
        data.randomSongsLastMonth.length > 0 ||
        data.hiddenGems.length > 0 ||
        data.communityTop.length > 0 ||
        data.monthlyTop.length > 0;

    if (!hasContent) {
        return (
            <>
                <Header />
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No music yet</Text>
                </View>
            </>
        );
    }

    const previousMonth = getPreviousMonthKey();

    return (
        <>
            <Header />
            <View style={styles.container}>
                <FlatList
                    data={[
                        {
                            key: "quick",
                            title: "Quick Selections",
                            songs: data.randomSongsLastMonth,
                        },
                        {
                            key: "recent",
                            title: "Recently Played",
                            songs: data.songsByTimePlayed,
                        },
                        {
                            key: "hidden",
                            title: "Hidden Gems",
                            songs: data.hiddenGems,
                        },
                        {
                            key: "community",
                            title: "Community Top",
                            songs: data.communityTop,
                        },
                        {
                            key: "monthly",
                            title: `${previousMonth.charAt(0).toUpperCase() + previousMonth.slice(1)} Recap`,
                            songs: data.monthlyTop,
                        },
                    ].filter((s) => s.songs.length > 0)}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => (
                        <SongSection title={item.title} songs={item.songs} />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centerContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: { paddingBottom: 20 },
    section: { marginTop: 24 },
    sectionTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: "bold",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    songListContent: { paddingHorizontal: 16, gap: 12 },
    songCard: { width: 120 },
    songImage: { width: 120, height: 120, borderRadius: 8 },
    songName: { color: COLORS.white, fontSize: 14, marginTop: 8 },
    songArtist: { color: COLORS.gray400, fontSize: 12, marginTop: 2 },
    errorText: { color: COLORS.accent, fontSize: 16 },
    emptyText: { color: COLORS.gray400, fontSize: 16 },
});
