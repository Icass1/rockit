import { memo, useState } from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { Animated, StyleSheet, Text } from "react-native";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

const CARD_WIDTH = 140;

interface SongCardProps {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
    onPress?: (
        song: BaseSongWithAlbumResponse,
        songs: BaseSongWithAlbumResponse[]
    ) => void;
}

const SongCard = memo(function SongCard({
    song,
    songs,
    onPress,
}: SongCardProps) {
    const styles = useThemedStyles(createStyles);
    const [scale] = useState(() => new Animated.Value(1));

    return (
        <Animated.View style={{ transform: [{ scale }], width: CARD_WIDTH }}>
            <MediaPressableWrapper media={song} allMedia={songs}>
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
            </MediaPressableWrapper>
        </Animated.View>
    );
});

export default SongCard;

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        image: {
            width: CARD_WIDTH,
            height: CARD_WIDTH,
            borderRadius: 10,
            marginBottom: theme.spacing.sm,
            backgroundColor: theme.legacy.bgCard,
        },
        name: {
            fontSize: 13,
            fontWeight: "600",
            color: theme.legacy.white,
            marginBottom: 3,
        },
        artist: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
        },
    });
