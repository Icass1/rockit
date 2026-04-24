import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { BaseAlbumWithSongsResponse, getAlbumAsync } from "@rockit/shared";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import RenderList from "@/components/RenderList/RenderList";

export default function AlbumPage() {
    const { publicId } = useLocalSearchParams<{ publicId: string }>();
    const [album, setAlbum] = useState<BaseAlbumWithSongsResponse | null>(null);

    useEffect(() => {
        if (!publicId) return;
        getAlbumAsync(publicId).then(setAlbum);
    }, [publicId]);

    if (!album) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: COLORS.bg,
                }}
            >
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <RenderList
            title={album.name}
            subtitle={album.releaseDate}
            imageUrl={album.imageUrl}
            artists={album.artists}
            media={album.songs}
            substractArtists={album.artists.map((a) => a.name)}
            showMediaIndex={true}
            showMediaImage={false}
        />
    );
}
