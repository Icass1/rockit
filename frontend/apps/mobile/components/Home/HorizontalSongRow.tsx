import { memo, useCallback } from "react";
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

const ItemSeparator = () => <View style={{ width: 12 }} />;

function HorizontalSongRow({
    title,
    songs,
    listKey,
    onSongPress,
}: HorizontalSongRowProps) {
    const renderItem = useCallback(
        ({ item }: { item: BaseSongWithAlbumResponse }) => (
            <SongCard song={item} songs={songs} onPress={onSongPress} />
        ),
        [songs, onSongPress]
    );

    if (songs.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <FlatList
                data={songs}
                horizontal
                keyExtractor={(item) => item.publicId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={ItemSeparator}
                renderItem={renderItem}
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

export default memo(HorizontalSongRow);
