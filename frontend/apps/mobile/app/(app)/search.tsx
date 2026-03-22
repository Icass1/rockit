import { useCallback, useRef, useState } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import {
    API_ENDPOINTS,
    SearchResultsResponseSchema,
    type BaseSearchResultsItem,
} from "@rockit/shared";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { apiFetch } from "@/lib/api";
import Header from "@/components/layout/Header";

export default function SearchScreen() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<BaseSearchResultsItem[] | null>(
        null
    );
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearch = useCallback(async (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) {
            setResults(null);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            setError(null);
            try {
                const res = await apiFetch(
                    `${API_ENDPOINTS.search}?q=${encodeURIComponent(text)}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const parsed = SearchResultsResponseSchema.parse(json);
                setResults(parsed.results);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Search failed");
                setResults(null);
            }
            setSearching(false);
        }, 300);
    }, []);

    const songs = results?.filter((r) => r.type === "song") ?? [];
    const albums = results?.filter((r) => r.type === "album") ?? [];
    const artists = results?.filter((r) => r.type === "artist") ?? [];

    return (
        <>
            <Header />
            <View style={styles.container}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your music..."
                        placeholderTextColor={COLORS.gray400}
                        value={query}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {!query && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Search your music</Text>
                    </View>
                )}

                {searching && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.accent} />
                    </View>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {results && !searching && (
                    <ScrollView
                        style={styles.resultsContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {songs.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Songs</Text>
                                <FlatList
                                    data={songs}
                                    keyExtractor={(item) => `song-${item.url}`}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <Pressable style={styles.songRow}>
                                            <Image
                                                source={
                                                    item.imageUrl ||
                                                    PLACEHOLDER.song
                                                }
                                                style={styles.songImage}
                                                contentFit="cover"
                                            />
                                            <View style={styles.itemInfo}>
                                                <Text
                                                    style={styles.itemName}
                                                    numberOfLines={1}
                                                >
                                                    {item.title}
                                                </Text>
                                                <Text
                                                    style={styles.itemSubtitle}
                                                    numberOfLines={1}
                                                >
                                                    {item.artists
                                                        ?.map((a) => a.name)
                                                        .join(", ")}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        )}

                        {albums.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Albums</Text>
                                <FlatList
                                    data={albums}
                                    keyExtractor={(item) => `album-${item.url}`}
                                    numColumns={2}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <View style={styles.gridItem}>
                                            <Image
                                                source={
                                                    item.imageUrl ||
                                                    PLACEHOLDER.playlist
                                                }
                                                style={styles.gridImage}
                                                contentFit="cover"
                                            />
                                            <Text
                                                style={styles.itemName}
                                                numberOfLines={1}
                                            >
                                                {item.title}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>
                        )}

                        {artists.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Artists</Text>
                                <FlatList
                                    data={artists}
                                    keyExtractor={(item) =>
                                        `artist-${item.url}`
                                    }
                                    horizontal
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <View style={styles.artistCard}>
                                            <Image
                                                source={
                                                    item.imageUrl ||
                                                    PLACEHOLDER.user
                                                }
                                                style={styles.artistImage}
                                                contentFit="cover"
                                            />
                                            <Text
                                                style={styles.itemName}
                                                numberOfLines={1}
                                            >
                                                {item.title}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    searchInput: {
        backgroundColor: "#202020",
        borderRadius: 999,
        color: COLORS.white,
        fontSize: 16,
        height: 44,
        paddingHorizontal: 20,
    },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyText: { color: COLORS.gray400, fontSize: 16 },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { color: COLORS.accent, fontSize: 14 },
    resultsContainer: { flex: 1, paddingHorizontal: 16 },
    section: { marginBottom: 24 },
    sectionTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    songRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    songImage: { width: 48, height: 48, borderRadius: 4 },
    itemInfo: { marginLeft: 12, flex: 1 },
    itemName: { color: COLORS.white, fontSize: 14 },
    itemSubtitle: { color: COLORS.gray400, fontSize: 12, marginTop: 2 },
    gridItem: { flex: 1, margin: 4, maxWidth: "50%" },
    gridImage: { width: "100%", aspectRatio: 1, borderRadius: 8 },
    artistCard: { marginRight: 16, alignItems: "center" },
    artistImage: { width: 100, height: 100, borderRadius: 50 },
});
