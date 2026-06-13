import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { getPlaylistAsync } from "@/services/mediaService";
import { BasePlaylistWithMediasResponse } from "@/shared/dto";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import RenderList from "@/components/RenderList/RenderList";

export default function PlaylistPage() {
    const { publicId } = useLocalSearchParams<{ publicId: string }>();
    const [playlist, setPlaylist] = useState<
        BasePlaylistWithMediasResponse | undefined
    >(undefined);

    useEffect(() => {
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

    const expandedByMediaId: Record<string, boolean> = {};
    for (const m of playlist.medias) {
        expandedByMediaId[m.item.publicId] = m.expanded;
    }

    return (
        <RenderList
            title={playlist.name}
            imageUrl={playlist.imageUrl}
            media={playlist.medias.map((m) => m.item)}
            showMediaIndex={false}
            showMediaImage={true}
            listPublicId={publicId}
            expandedByMediaId={expandedByMediaId}
        />
    );
}
