import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { FlatList, StyleSheet, Text, View } from "react-native";
import SongCard from "./SongCard";

interface HorizontalSongRowProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
    listKey: string;
    onSongPress?: (
        song: BaseSongWithAlbumResponse,
        allSongs: BaseSongWithAlbumResponse[]
    ) => void;
}

export default function HorizontalSongRow({
    title,
    songs,
    listKey,
    onSongPress,
}: HorizontalSongRowProps) {
    if (songs.length === 0) return null;

    const handlePlay = (
        song: BaseSongWithAlbumResponse,
        allSongs: BaseSongWithAlbumResponse[]
    ) => {
        if (onSongPress) {
            onSongPress(song, allSongs);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <FlatList
                data={songs}
                horizontal
                keyExtractor={(item) => item.publicId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item }) => (
                    <SongCard song={item} songs={songs} onPress={handlePlay} />
                )}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 28 },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#ffffff",
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    listContent: {
        paddingHorizontal: 20,
    },
});
