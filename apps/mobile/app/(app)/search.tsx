import {
    IconButton,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Radio } from "@rockit/ui/icons";
import {
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";
import { Header, PageContainer } from "@/components/layout";
import { MediaCardSkeleton } from "@/components/Media";
import {
    EmptyState,
    SearchBar,
    SearchSection,
    useSearch,
} from "@/components/Search";

function SearchSkeletons() {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
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
                <Text style={styles.skeletonTitle}>{vocabulary.ALBUMS}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3, 4].map((i) => (
                        <MediaCardSkeleton key={i} width={140} />
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

export default function SearchScreen() {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
    const router = useTypedRouter();
    const { height } = useWindowDimensions();
    const { vocabulary } = useVocabulary();
    const { results, searching, error, query, search, clearResults } =
        useSearch();

    const songs = results.filter((r) => r.type === "song");
    const albums = results.filter((r) => r.type === "album");
    const artists = results.filter((r) => r.type === "artist");
    const playlists = results.filter((r) => r.type === "playlist");
    const radios = results.filter((r) => r.type === "radio");
    const videos = results.filter((r) => r.type === "video");

    const centeredStyle = {
        minHeight: height * 0.6,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    };

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
                    <View style={styles.resultsContent}>
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
                        <SearchSection
                            title={vocabulary.RADIO}
                            items={radios}
                            layout="row"
                        />
                    </View>
                )}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        paddingVertical: theme.spacing.lg,
                    }}
                >
                    <Text style={{ flex: 1, color: styles.exploreText.color }}>
                        {vocabulary.MOBILE_RADIO_EXPLORE}
                    </Text>
                    <IconButton
                        label={vocabulary.MOBILE_RADIO_EXPLORE}
                        onPress={() => router.push("/radio")}
                    >
                        <Radio />
                    </IconButton>
                </View>
            </PageContainer>
        </>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        exploreText: { color: theme.colors.foreground },
        errorText: {
            color: theme.legacy.accent,
            fontSize: theme.typography.body,
            textAlign: "center",
        },
        loadingText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.label,
        },
        resultsContainer: {
            flex: 1,
        },
        resultsContent: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xxl,
        },
        skeletonsContainer: {
            paddingVertical: 20,
        },
        skeletonSection: {
            marginBottom: theme.spacing.xl,
        },
        skeletonTitle: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.caption,
            fontWeight: "700",
            letterSpacing: 1.5,
            marginBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
        },
        rowSkeleton: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
        },
    });
