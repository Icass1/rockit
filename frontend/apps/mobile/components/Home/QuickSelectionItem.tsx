import { useRef } from "react";
import { COLORS } from "@/constants/theme";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Image } from "expo-image";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface QuickSelectionItemProps {
    song: BaseSongWithAlbumResponse;
    songs: BaseSongWithAlbumResponse[];
    onPress: (
        song: BaseSongWithAlbumResponse,
        songs: BaseSongWithAlbumResponse[]
    ) => void;
}

export default function QuickSelectionItem({
    song,
    songs,
    onPress,
}: QuickSelectionItemProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, {
            toValue: 0.96,
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
        <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
            <TouchableOpacity
                style={styles.container}
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
                <View style={styles.textContainer}>
                    <Text style={styles.name} numberOfLines={1}>
                        {song.name}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {song.artists[0]?.name}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bgCard,
        borderRadius: 8,
        overflow: "hidden",
    },
    image: {
        width: 52,
        height: 52,
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    name: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.white,
        marginBottom: 2,
    },
    artist: {
        fontSize: 11,
        color: COLORS.gray400,
    },
});
