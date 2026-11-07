import { PLACEHOLDER } from "@/constants/assets";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

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
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
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
                                                    vocabulary.UNKNOWN}
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.lg,
        },
        title: {
            color: theme.legacy.white,
            fontSize: 20,
            fontWeight: "bold",
            paddingHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.md,
        },
        scrollContent: {
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.lg,
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
            borderRadius: theme.radius.sm,
            backgroundColor: theme.legacy.bgCard,
        },
        textContainer: {
            flex: 1,
            marginLeft: 10,
            minWidth: 0,
        },
        songName: {
            color: theme.legacy.white,
            fontSize: 13,
            fontWeight: "500",
        },
        artistName: {
            color: theme.legacy.gray400,
            fontSize: 11,
            marginTop: 2,
        },
        pressed: {
            opacity: 0.7,
        },
    });
