import { useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
    EEvent,
    EventManager,
    type CollectionPageState,
    type IMediaAddedToPlaylistEvent,
    type IMediaRemovedFromPlaylistEvent,
} from "@rockit/shared";
import { useDesignTheme, type DesignTheme } from "@rockit/ui";
import { View } from "react-native";
import RecommendationsList from "@/components/Recommendations/RecommendationsList";
import CollectionControls from "@/components/RenderList/CollectionControls";
import CollectionFooter from "@/components/RenderList/CollectionFooter";
import RenderList from "@/components/RenderList/RenderList";

export default function CollectionScreen({
    publicId,
    initial,
}: {
    publicId: string;
    initial?: Partial<CollectionPageState>;
}) {
    const theme = useDesignTheme();
    const pager = useMemo(
        () => new CollectionPager(publicId, initial),
        [publicId, initial]
    );
    const state = useStore(pager.state);
    useEffect(() => {
        if (!pager.state.get().collection) void pager.load();
        const events = EventManager.getInstance();
        const refresh = (
            event: IMediaAddedToPlaylistEvent | IMediaRemovedFromPlaylistEvent
        ): void => {
            if (event.playlistPublicId === publicId) void pager.load(0);
        };
        events.addEventListener(EEvent.MediaAddedToPlaylist, refresh);
        events.addEventListener(EEvent.MediaRemovedFromPlaylist, refresh);
        return () => {
            pager.dispose();
            events.removeEventListener(EEvent.MediaAddedToPlaylist, refresh);
            events.removeEventListener(
                EEvent.MediaRemovedFromPlaylist,
                refresh
            );
        };
    }, [pager, publicId]);
    const collection = state.collection;
    if (!collection)
        return (
            <View style={{ flex: 1, backgroundColor: theme.legacy.bg }}>
                <CollectionControls pager={pager} />
                <CollectionFooter pager={pager} />
            </View>
        );
    const album = collection.type === "album";
    const seedSongPublicId = state.media[0]?.publicId;
    return (
        <RenderList
            title={collection.name}
            imageUrl={collection.imageUrl}
            artists={album ? collection.artists : [collection.owner]}
            media={state.media}
            showMediaIndex={album}
            showMediaImage={!album}
            listPublicId={publicId}
            expandedByMediaId={state.expandedByMediaId}
            pager={pager}
            total={state.total}
            offset={state.offset}
            footer={
                seedSongPublicId ? (
                    <RecommendationsList seedSongPublicId={seedSongPublicId} />
                ) : undefined
            }
        />
    );
}
