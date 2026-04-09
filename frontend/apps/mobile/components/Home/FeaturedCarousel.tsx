import { memo, useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 220;
const AUTO_SCROLL_INTERVAL = 4000;

interface FeaturedCarouselCardProps {
    song: BaseSongWithAlbumResponse;
    onPress: () => void;
}

const FeaturedCarouselCard = memo(function FeaturedCarouselCard({
    song,
    onPress,
}: FeaturedCarouselCardProps) {
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.card}
            onPress={onPress}
        >
            <Image
                source={{ uri: song.imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={200}
            />
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.85)"]}
                style={styles.gradient}
            />
            <View style={styles.info}>
                <Text style={styles.songName} numberOfLines={1}>
                    {song.name}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                    {song.artists[0]?.name}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

interface FeaturedCarouselProps {
    songs: BaseSongWithAlbumResponse[];
    title: string;
    onSongPress?: (
        song: BaseSongWithAlbumResponse,
        allSongs: BaseSongWithAlbumResponse[]
    ) => void;
}

export default function FeaturedCarousel({
    songs,
    title,
    onSongPress,
}: FeaturedCarouselProps) {
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isUserScrolling = useRef(false);

    const scrollTo = useCallback((index: number) => {
        flatListRef.current?.scrollToIndex({ index, animated: true });
        setActiveIndex(index);
    }, []);

    const startAutoScroll = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (!isUserScrolling.current) {
                setActiveIndex((prev) => {
                    const next = prev < songs.length - 1 ? prev + 1 : 0;
                    flatListRef.current?.scrollToIndex({
                        index: next,
                        animated: true,
                    });
                    return next;
                });
            }
        }, AUTO_SCROLL_INTERVAL);
    }, [songs.length]);

    useEffect(() => {
        if (songs.length > 1) {
            startAutoScroll();
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [songs.length, startAutoScroll]);

    const handleScrollBeginDrag = useCallback(() => {
        isUserScrolling.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const handleScrollEndDrag = useCallback(() => {
        isUserScrolling.current = false;
        if (songs.length > 1) startAutoScroll();
    }, [songs.length, startAutoScroll]);

    const handleMomentumScrollEnd = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)
            );
            setActiveIndex(Math.max(0, Math.min(index, songs.length - 1)));
        },
        [songs.length]
    );

    const handlePlaySong = useCallback(
        (song: BaseSongWithAlbumResponse) => {
            if (onSongPress) {
                onSongPress(song, songs);
            }
        },
        [onSongPress, songs]
    );

    const renderItem = useCallback(
        ({ item }: { item: BaseSongWithAlbumResponse }) => (
            <FeaturedCarouselCard
                song={item}
                onPress={() => handlePlaySong(item)}
            />
        ),
        [handlePlaySong]
    );

    const keyExtractor = useCallback(
        (item: BaseSongWithAlbumResponse) => item.publicId,
        []
    );

    const getItemLayout = useCallback(
        (_: unknown, index: number) => ({
            length: CARD_WIDTH + 12,
            offset: (CARD_WIDTH + 12) * index,
            index,
        }),
        []
    );

    if (songs.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <FlatList
                ref={flatListRef}
                data={songs}
                horizontal
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 12}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                getItemLayout={getItemLayout}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={true}
            />
            {songs.length > 1 && (
                <View style={styles.dotsContainer}>
                    {songs.slice(0, Math.min(songs.length, 8)).map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => scrollTo(i)}
                            style={[
                                styles.dot,
                                i === activeIndex && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 8 },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.white,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    listContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: COLORS.bgCard,
    },
    image: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
    gradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "65%",
    },
    info: {
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
    },
    songName: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.white,
        marginBottom: 3,
    },
    artistName: {
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
        fontWeight: "500",
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        marginTop: 10,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    dotActive: {
        width: 16,
        backgroundColor: COLORS.accent,
    },
});
