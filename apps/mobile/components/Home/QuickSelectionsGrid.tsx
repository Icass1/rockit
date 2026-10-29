import { PLACEHOLDER } from "@/constants/assets";
import { COLORS } from "@/constants/theme";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const SONGS_PER_COLUMN = 4;
const MAX_ITEMS = 12;

interface QuickSelectionsGridProps {
    title: string;
    items: BaseSongWithAlbumResponse[];
    onMediaPress: (
        item: BaseSongWithAlbumResponse,
        allItems: BaseSongWithAlbumResponse[]
    ) => void;
}

export default function QuickSelectionsGrid({
    title,
    items,
    onMediaPress,
}: QuickSelectionsGridProps) {
    if (items.length === 0) return null;

    const songsPool = items.slice(0, MAX_ITEMS);

    const columns = Math.ceil(items.length / SONGS_PER_COLUMN);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                snapToInterval={180}
                decelerationRate="fast"
            >
                {Array.from({ length: columns }).map((_, columnIndex) => (
                    <View key={columnIndex} style={styles.column}>
                        {items
                            .slice(
                                columnIndex * SONGS_PER_COLUMN,
                                columnIndex * SONGS_PER_COLUMN +
                                    SONGS_PER_COLUMN
                            )
                            .map((song) => (
                                <Pressable
                                    key={`${columnIndex}_${song.publicId}`}
                                    style={({ pressed }) =>
                                        pressed && styles.pressed
                                    }
                                    onPress={() =>
                                        onMediaPress(song, songsPool)
                                    }
                                >
                                    <View style={styles.rowItem}>
                                        <Image
                                            source={
                                                song.imageUrl ||
                                                PLACEHOLDER.song
                                            }
                                            style={styles.thumbnail}
                                            contentFit="cover"
                                        />
                                        <View style={styles.textContainer}>
                                            <Text
                                                style={styles.songName}
                                                numberOfLines={1}
                                            >
                                                {song.name}
                                            </Text>
                                            <Text
                                                style={styles.artistName}
                                                numberOfLines={1}
                                            >
                                                {song.artists?.[0]?.name ||
                                                    "Unknown Artist"}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
    },
    title: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "bold",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    column: {
        width: 160,
    },
    rowItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 4,
        backgroundColor: COLORS.bgCard,
    },
    textContainer: {
        flex: 1,
        marginLeft: 10,
        minWidth: 0,
    },
    songName: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: "500",
    },
    artistName: {
        color: COLORS.gray400,
        fontSize: 11,
        marginTop: 2,
    },
    pressed: {
        opacity: 0.7,
    },
});
