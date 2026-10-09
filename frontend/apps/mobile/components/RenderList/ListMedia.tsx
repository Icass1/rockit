import { useCallback, useEffect, useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
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
import CollectionControls from "@/components/RenderList/CollectionControls";
import CollectionFooter from "@/components/RenderList/CollectionFooter";
import { Media } from "@/components/RenderList/Media";

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
    substractArtists = [],
    listPublicId,
    defaultExpanded,
}: {
    media: TListMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    listPublicId?: string;
    defaultExpanded?: boolean;
}) {
    const $media = useMedia(_media);
    const [expanded, setExpanded] = useState(defaultExpanded ?? false);

    const handleToggle = useCallback((): void => {
        setExpanded((prev): boolean => {
            const newValue = !prev;
            if (listPublicId) {
                webSocketManager.sendMediaExpanded({
                    mediaPublicId: $media.publicId,
                    playlistPublicId: listPublicId,
                    expanded: newValue,
                });
            }
            return newValue;
        });
    }, [listPublicId, $media.publicId]);

    const pager = useMemo(
        () => new CollectionPager($media.publicId),
        [$media.publicId]
    );
    const state = useStore(pager.state);
    useEffect(() => {
        if (expanded && !pager.state.get().collection) void pager.load();
    }, [expanded, pager]);
    useEffect(() => () => pager.dispose(), [pager]);
    const medias = state.media;

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
            {expanded && (
                <View style={styles.mediaList}>
                    <CollectionControls pager={pager} />
                    {medias.map((media, i) => (
                        <Media
                            key={`${state.offset + i}:${media.publicId}`}
                            index={state.offset + i}
                            media={media}
                            allMedia={allMedia ?? []}
                            substractArtists={substractArtists}
                            showMediaIndex={isAlbum($media)}
                            showMediaImage={!isAlbum($media)}
                            listPublicId={listPublicId}
                        />
                    ))}
                    <CollectionFooter pager={pager} />
                </View>
            )}
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
