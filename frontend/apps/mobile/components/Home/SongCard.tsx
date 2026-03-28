import { useRef } from "react";
import { COLORS } from "@/constants/theme";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Image } from "expo-image";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

const CARD_WIDTH = 140;

interface SongCardProps {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
    onPress: (
        song: BaseSongWithAlbumResponse,
        songs: BaseSongWithAlbumResponse[]
    ) => void;
}

export default function SongCard({ song, songs, onPress }: SongCardProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 50,
        }).start();

    const handlePressOut = () =>
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
        }).start();

    return (
        <Animated.View style={{ transform: [{ scale }], width: CARD_WIDTH }}>
            <TouchableOpacity
                onPress={() => onPress(song, songs)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <Image
                    source={{ uri: song.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                />
                <Text style={styles.name} numberOfLines={2}>
                    {song.name}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {song.artists[0]?.name}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    image: {
        width: CARD_WIDTH,
        height: CARD_WIDTH,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: COLORS.bgCard,
    },
    name: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.white,
        marginBottom: 3,
    },
    artist: {
        fontSize: 12,
        color: COLORS.gray400,
    },
});
