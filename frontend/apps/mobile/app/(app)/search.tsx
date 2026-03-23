import { COLORS } from "@/constants/theme";
import {
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { Header, PageContainer } from "@/components/layout";
import {
    EmptyState,
    SearchBar,
    SearchSection,
    useSearch,
} from "@/components/Search";

export default function SearchScreen() {
    const { height } = useWindowDimensions();
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
                        {searching && !results.length && (
                            <Text style={styles.loadingText}>Searching...</Text>
                        )}
                    </View>
                )}

                {query && !searching && results.length > 0 && (
                    <ScrollView
                        style={styles.resultsContainer}
                        contentContainerStyle={styles.resultsContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <SearchSection
                            title="Songs"
                            items={songs}
                            layout="row"
                        />
                        <SearchSection
                            title="Albums"
                            items={albums}
                            layout="grid"
                        />
                        <SearchSection
                            title="Artists"
                            items={artists}
                            layout="artist"
                        />
                        <SearchSection
                            title="Playlists"
                            items={playlists}
                            layout="grid"
                        />
                        <SearchSection
                            title="Videos"
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
});
