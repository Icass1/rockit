import { COLORS } from "@/constants/theme";
import {
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import { Header, PageContainer } from "@/components/layout";
import { MediaCardSkeleton } from "@/components/Media";
import {
    EmptyState,
    SearchBar,
    SearchSection,
    useSearch,
} from "@/components/Search";

export default function SearchScreen() {
    const { height } = useWindowDimensions();
    const { vocabulary } = useVocabulary();
    const { results, searching, error, query, search, clearResults } =
        useSearch();

    const songs = results.filter((r) => r.type === "song");
    const albums = results.filter((r) => r.type === "album");
    const artists = results.filter((r) => r.type === "artist");
    const playlists = results.filter((r) => r.type === "playlist");
    const videos = results.filter((r) => r.type === "video");

    const centeredStyle = {
        minHeight: height * 0.6,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    };

    function SearchSkeletons() {
        return (
            <View style={styles.skeletonsContainer}>
                <View style={styles.skeletonSection}>
                    <Text style={styles.skeletonTitle}>{vocabulary.SONGS}</Text>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.rowSkeleton}>
                            <MediaCardSkeleton width={280} />
                        </View>
                    ))}
                </View>
                <View style={styles.skeletonSection}>
                    <Text style={styles.skeletonTitle}>
                        {vocabulary.ALBUMS}
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {[1, 2, 3, 4].map((i) => (
                            <MediaCardSkeleton key={i} width={140} />
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    }

    return (
        <>
            <Header />
            <PageContainer>
                <SearchBar
                    value={query}
                    onChangeText={search}
                    isSearching={searching}
                    onClear={clearResults}
                />

                {(!query || error || (searching && !results.length)) && (
                    <View style={centeredStyle}>
                        {!query && !searching && !error && <EmptyState />}
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        {searching && !results.length && <SearchSkeletons />}
                    </View>
                )}

                {query && !searching && results.length > 0 && (
                    <ScrollView
                        style={styles.resultsContainer}
                        contentContainerStyle={styles.resultsContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <SearchSection
                            title={vocabulary.SONGS}
                            items={songs}
                            layout="row"
                        />
                        <SearchSection
                            title={vocabulary.ALBUMS}
                            items={albums}
                            layout="grid"
                        />
                        <SearchSection
                            title={vocabulary.ARTISTS}
                            items={artists}
                            layout="artist"
                        />
                        <SearchSection
                            title={vocabulary.PLAYLISTS}
                            items={playlists}
                            layout="grid"
                        />
                        <SearchSection
                            title={vocabulary.VIDEOS}
                            items={videos}
                            layout="grid"
                        />
                    </ScrollView>
                )}
            </PageContainer>
        </>
    );
}

const styles = StyleSheet.create({
    errorText: {
        color: COLORS.accent,
        fontSize: 14,
        textAlign: "center",
    },
    loadingText: {
        color: COLORS.gray400,
        fontSize: 16,
    },
    resultsContainer: {
        flex: 1,
    },
    resultsContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    skeletonsContainer: {
        paddingVertical: 20,
    },
    skeletonSection: {
        marginBottom: 24,
    },
    skeletonTitle: {
        color: COLORS.gray600,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    rowSkeleton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
});
