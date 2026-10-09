import { useEffect, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
    EEvent,
    EventManager,
    type IMediaAddedToPlaylistEvent,
    type IMediaRemovedFromPlaylistEvent,
} from "@rockit/shared";
import { View } from "react-native";
import CollectionControls from "@/components/RenderList/CollectionControls";
import CollectionFooter from "@/components/RenderList/CollectionFooter";
import RenderList from "@/components/RenderList/RenderList";

export default function CollectionScreen({ publicId }: { publicId: string }) {
    const pager = useMemo(() => new CollectionPager(publicId), [publicId]);
    const state = useStore(pager.state);
    useEffect(() => {
        void pager.load();
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
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                <CollectionControls pager={pager} />
                <CollectionFooter pager={pager} />
            </View>
        );
    const album = collection.type === "album";
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
        />
    );
}
