import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
    CollectionTree,
    EEvent,
    EventManager,
    isList,
    isPlayable,
    type CollectionTreeRow,
    type IMediaAddedToPlaylistEvent,
    type IMediaDownloadedEvent,
    type IMediaRemovedFromPlaylistEvent,
} from "@rockit/shared";
import { FlatList, View, type ViewToken } from "react-native";
import CollectionControls from "@/components/RenderList/CollectionControls";
import CollectionFooter from "@/components/RenderList/CollectionFooter";
import { ListMedia } from "@/components/RenderList/ListMedia";
import { PlayableMedia } from "@/components/RenderList/PlayableMedia";

const TreeRow = memo(function TreeRow({
    row,
    tree,
    visible,
    listPublicId,
    substractArtists,
}: {
    row: CollectionTreeRow;
    tree: CollectionTree;
    visible: boolean;
    listPublicId: string;
    substractArtists: string[];
}) {
    const page = useStore(tree.root.state);
    useEffect(() => {
        if (row.kind === "controls" && row.collectionKey !== "root")
            tree.ensureLoaded(row.collectionKey);
    }, [tree, row]);
    if (row.kind === "controls")
        return <CollectionControls pager={row.pager} />;
    if (row.kind === "footer")
        return <CollectionFooter pager={row.pager} visible={visible} />;
    if (isList(row.media))
        return (
            <ListMedia
                media={row.media}
                allMedia={page.media}
                listPublicId={listPublicId}
                expansionPlaylistPublicId={row.parentPublicId}
                expanded={row.expanded}
                cycle={row.cycle}
                onToggle={() => {
                    tree.toggle(row.key);
                }}
            />
        );
    if (isPlayable(row.media))
        return (
            <PlayableMedia
                media={row.media}
                allMedia={page.media}
                index={row.index}
                listPublicId={listPublicId}
                substractArtists={substractArtists}
                showMediaIndex={row.showMediaIndex}
                showMediaImage={row.showMediaImage}
            />
        );
    return <View />;
});

export default function VirtualCollectionList({
    pager,
    showMediaIndex,
    showMediaImage,
    substractArtists,
    header,
}: {
    pager: CollectionPager;
    showMediaIndex: boolean;
    showMediaImage: boolean;
    substractArtists: string[];
    header: ReactNode;
}) {
    const tree = useMemo(
        () => new CollectionTree(pager, { showMediaIndex, showMediaImage }),
        [pager, showMediaIndex, showMediaImage]
    );
    const rows = useStore(tree.rows);
    const [visible, setVisible] = useState(new Set<string>());
    const viewabilityConfig = useMemo(
        () => ({ itemVisiblePercentThreshold: 1, minimumViewTime: 50 }),
        []
    );
    const onViewableItemsChanged = useCallback(
        ({
            viewableItems,
        }: {
            viewableItems: ViewToken<CollectionTreeRow>[];
        }) => {
            setVisible(new Set(viewableItems.map((token) => token.item.key)));
        },
        []
    );
    useEffect(() => {
        tree.start();
        const events = EventManager.getInstance();
        const refresh = (
            event: IMediaAddedToPlaylistEvent | IMediaRemovedFromPlaylistEvent
        ): void => tree.refreshNested(event.playlistPublicId);
        const downloaded = (event: IMediaDownloadedEvent): void => {
            void tree.refreshMediaAsync(event.publicId);
        };
        events.addEventListener(EEvent.MediaDownloaded, downloaded);
        events.addEventListener(EEvent.MediaAddedToPlaylist, refresh);
        events.addEventListener(EEvent.MediaRemovedFromPlaylist, refresh);
        return () => {
            tree.stop();
            events.removeEventListener(EEvent.MediaDownloaded, downloaded);
            events.removeEventListener(EEvent.MediaAddedToPlaylist, refresh);
            events.removeEventListener(
                EEvent.MediaRemovedFromPlaylist,
                refresh
            );
        };
    }, [tree]);
    return (
        <FlatList
            key={pager.publicId}
            data={rows}
            extraData={visible}
            keyExtractor={(row) => row.key}
            ListHeaderComponent={<>{header}</>}
            renderItem={({ item }) => (
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingLeft: 10 + Math.min(item.depth, 8) * 18,
                        paddingBottom: 8,
                    }}
                >
                    <TreeRow
                        row={item}
                        tree={tree}
                        visible={visible.has(item.key)}
                        listPublicId={pager.publicId}
                        substractArtists={substractArtists}
                    />
                </View>
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialNumToRender={16}
            maxToRenderPerBatch={12}
            windowSize={7}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
        />
    );
}
