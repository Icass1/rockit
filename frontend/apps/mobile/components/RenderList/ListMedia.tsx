import { useCallback } from "react";
import { COLORS } from "@/constants/theme";
import {
    isAlbum,
    isPlaylist,
    type TListMedia,
    type TMedia,
} from "@rockit/shared";
import { Image } from "expo-image";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useMedia } from "@/hooks/useMedia";
import { webSocketManager } from "@/lib/webSocketManager";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

function ListArtists({ media }: { media: TListMedia }) {
    if (isAlbum(media)) {
        const artists = media.artists.map((a) => a.name).join(", ");
        if (!artists) return null;
        return (
            <Text style={styles.artistText} numberOfLines={1}>
                {artists}
            </Text>
        );
    } else if (isPlaylist(media)) {
        const contributors = media.contributors
            .map((c) => c.username)
            .join(", ");
        if (!contributors) return null;
        return (
            <Text style={styles.artistText} numberOfLines={1}>
                {contributors}
            </Text>
        );
    }
    return null;
}

export function ListMedia({
    media: _media,
    allMedia,
    listPublicId,
    expansionPlaylistPublicId,
    expanded = false,
    onToggle,
    cycle = false,
}: {
    media: TListMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    listPublicId?: string;
    expansionPlaylistPublicId?: string;
    expanded?: boolean;
    onToggle?: () => void;
    cycle?: boolean;
}) {
    const $media = useMedia(_media);
    const handleToggle = useCallback((): void => {
        if (cycle) return;
        onToggle?.();
        if (listPublicId) {
            webSocketManager.sendMediaExpanded({
                mediaPublicId: $media.publicId,
                playlistPublicId: expansionPlaylistPublicId ?? listPublicId,
                expanded: !expanded,
            });
        }
    }, [
        cycle,
        onToggle,
        listPublicId,
        expansionPlaylistPublicId,
        $media.publicId,
        expanded,
    ]);

    return (
        <View style={styles.container}>
            <MediaPressableWrapper
                media={$media}
                allMedia={allMedia ?? []}
                listPublicId={listPublicId}
                onPress={handleToggle}
            >
                <View style={styles.header}>
                    <Image
                        source={{ uri: $media.imageUrl }}
                        style={styles.image}
                        contentFit="cover"
                    />
                    <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>
                            {$media.name}
                        </Text>
                        <ListArtists media={$media} />
                    </View>
                    {expanded ? (
                        <ChevronDown size={16} color={COLORS.gray400} />
                    ) : (
                        <ChevronRight size={16} color={COLORS.gray400} />
                    )}
                </View>
            </MediaPressableWrapper>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "column",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.gray800,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.bgCard,
        padding: 6,
    },
    image: {
        width: 48,
        height: 48,
        borderRadius: 6,
        backgroundColor: COLORS.bgCardLight,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontWeight: "500",
        color: COLORS.white,
    },
    artistText: {
        color: COLORS.gray400,
        fontSize: 13,
    },
    mediaList: {
        flexDirection: "column",
        gap: 4,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
});
