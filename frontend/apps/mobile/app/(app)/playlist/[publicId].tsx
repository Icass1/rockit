import React from "react";
import { COLORS } from "@/constants/theme";
import { BasePlaylistResponse, getPlaylistAsync } from "@rockit/shared";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import RenderList from "@/components/RenderList/RenderList";

export default function PlaylistPage() {
    const { publicId } = useLocalSearchParams<{ publicId: string }>();
    const [playlist, setPlaylist] = React.useState<BasePlaylistResponse | null>(
        null
    );

    React.useEffect(() => {
        if (!publicId) return;
        getPlaylistAsync(publicId).then(setPlaylist);
    }, [publicId]);

    if (!playlist) {
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
            title={playlist.name}
            imageUrl={playlist.imageUrl}
            media={playlist.medias.map((m) => m.item)}
            showMediaIndex={false}
            showMediaImage={true}
        />
    );
}
