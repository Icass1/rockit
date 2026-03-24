import { useMemo, useState } from "react";
import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import {
    API_ENDPOINTS,
    filterBySearch,
    LibraryListsResponse,
    LibraryListsResponseSchema,
    sortItems,
    type FilterMode,
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
import { useApiFetch } from "@/lib/useApiFetch";
import Header from "@/components/layout/Header";

type TabKey = "all" | "albums" | "playlists" | "songs";

const TABS: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "albums", label: "Albums" },
    { key: "playlists", label: "Playlists" },
    { key: "songs", label: "Songs" },
];

export default function LibraryScreen() {
    const { data, loading, error } = useApiFetch<LibraryListsResponse>(
        API_ENDPOINTS.libraryLists,
        LibraryListsResponseSchema
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [sortMode, setSortMode] = useState<FilterMode>("default");

    const filteredData = useMemo(() => {
        if (!data) return null;

        let items: {
            name: string;
            publicId: string;
            imageUrl: string;
            type: string;
        }[] = [];

        if (activeTab === "all") {
            items = [
                ...data.albums.map((a) => ({
                    name: a.name,
                    publicId: a.publicId,
                    imageUrl: a.imageUrl,
                    type: "album",
                })),
                ...data.playlists.map((p) => ({
                    name: p.name,
                    publicId: p.publicId,
                    imageUrl: p.imageUrl,
                    type: "playlist",
                })),
                ...data.songs.map((s) => ({
                    name: s.name,
                    publicId: s.publicId,
                    imageUrl: s.imageUrl,
                    type: "song",
                })),
            ];
        } else if (activeTab === "albums") {
            items = data.albums.map((a) => ({
                name: a.name,
                publicId: a.publicId,
                imageUrl: a.imageUrl,
                type: "album",
            }));
        } else if (activeTab === "playlists") {
            items = data.playlists.map((p) => ({
                name: p.name,
                publicId: p.publicId,
                imageUrl: p.imageUrl,
                type: "playlist",
            }));
        } else {
            items = data.songs.map((s) => ({
                name: s.name,
                publicId: s.publicId,
                imageUrl: s.imageUrl,
                type: "song",
            }));
        }

        const filtered = filterBySearch(items, searchQuery);
        return sortItems(filtered, sortMode);
    }, [data, searchQuery, activeTab, sortMode]);

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

    return (
        <>
            <Header />
            <View style={styles.container}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search library..."
                        placeholderTextColor={COLORS.gray400}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.tabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {TABS.map((tab) => (
                            <Pressable
                                key={tab.key}
                                style={[
                                    styles.tab,
                                    activeTab === tab.key && styles.tabActive,
                                ]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === tab.key &&
                                            styles.tabTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    key={activeTab}
                    data={filteredData ?? []}
                    keyExtractor={(item) => item.publicId}
                    numColumns={
                        activeTab === "albums" ||
                        activeTab === "playlists" ||
                        activeTab === "all"
                            ? 2
                            : 1
                    }
                    renderItem={({ item }) => (
                        <View
                            style={
                                activeTab === "songs"
                                    ? styles.songRow
                                    : styles.gridItem
                            }
                        >
                            <Image
                                source={item.imageUrl || PLACEHOLDER.song}
                                style={
                                    activeTab === "songs"
                                        ? styles.songImage
                                        : styles.gridImage
                                }
                                contentFit="cover"
                            />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={styles.itemType}>{item.type}</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
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
    searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
    searchInput: {
        backgroundColor: "#202020",
        borderRadius: 999,
        color: COLORS.white,
        fontSize: 16,
        height: 44,
        paddingHorizontal: 20,
    },
    tabsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 999,
        backgroundColor: COLORS.bgCard,
    },
    tabActive: { backgroundColor: COLORS.accent },
    tabText: { color: COLORS.gray400, fontSize: 14 },
    tabTextActive: { color: COLORS.white },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    gridItem: { flex: 1, margin: 4, maxWidth: "50%" },
    gridImage: { width: "100%", aspectRatio: 1, borderRadius: 8 },
    songRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    songImage: { width: 48, height: 48, borderRadius: 4 },
    itemInfo: { marginLeft: 12, flex: 1 },
    itemName: { color: COLORS.white, fontSize: 14 },
    itemType: { color: COLORS.gray400, fontSize: 12 },
    errorText: { color: COLORS.accent, fontSize: 16 },
});
