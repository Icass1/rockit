import { useCallback, useMemo, type ReactNode } from "react";
import {
    isSearchResult,
    type BaseAlbumWithoutSongsResponse,
    type BasePlaylistWithoutMediasResponse,
    type BaseSongWithAlbumResponse,
    type BaseStationResponse,
    type BaseVideoResponse,
    type TMedia,
} from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { ELibraryActiveType } from "@/models/enums/libraryActiveType";
import { useVocabulary } from "@/lib/vocabulary";
import SectionTitle from "@/components/layout/SectionTitle";
import MediaCard from "@/components/Media/MediaCard";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryContentProps {
    header?: ReactNode;
    footer?: ReactNode;
    albums: BaseAlbumWithoutSongsResponse[];
    playlists: BasePlaylistWithoutMediasResponse[];
    songs: BaseSongWithAlbumResponse[];
    videos: BaseVideoResponse[];
    stations: BaseStationResponse[];
    shared: BasePlaylistWithoutMediasResponse[];
    activeType: ELibraryActiveType;
    viewMode: "grid" | "list";
}

type ItemType = "album" | "playlist" | "song" | "video" | "station";

interface Section {
    title: string;
    data: TMedia[][];
    renderType: "grid" | "list";
}

export default function LibraryContent({
    header,
    footer,
    albums,
    playlists,
    songs,
    videos,
    stations,
    shared,
    activeType,
    viewMode,
}: LibraryContentProps) {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();

    const sections: Section[] = useMemo(() => {
        const result: Section[] = [];

        const createRows = (items: TMedia[]): TMedia[][] => {
            if (viewMode === "list") {
                return items.map((item) => [item]);
            }

            const rows: TMedia[][] = [];
            for (let index = 0; index < items.length; index += 2) {
                rows.push(items.slice(index, index + 2));
            }
            return rows;
        };

        const createItems = (items: TMedia[], type: ItemType): TMedia[] =>
            items.filter((item) => item.type === type);

        if (albums.length > 0) {
            result.push({
                title: vocabulary.ALBUMS,
                data: createRows(createItems(albums, "album")),
                renderType: viewMode,
            });
        }
        if (playlists.length > 0) {
            result.push({
                title: vocabulary.PLAYLISTS,
                data: createRows(createItems(playlists, "playlist")),
                renderType: viewMode,
            });
        }
        if (songs.length > 0) {
            result.push({
                title: vocabulary.SONGS,
                data: createRows(createItems(songs, "song")),
                renderType: viewMode,
            });
        }
        if (videos.length > 0) {
            result.push({
                title: vocabulary.VIDEOS,
                data: createRows(createItems(videos, "video")),
                renderType: viewMode,
            });
        }
        if (stations.length)
            result.push({
                title: vocabulary.RADIO_STATIONS,
                data: createRows(stations),
                renderType: viewMode,
            });
        if (shared.length)
            result.push({
                title: vocabulary.SHARED_2_YOU,
                data: createRows(shared),
                renderType: viewMode,
            });
        return result;
    }, [
        albums,
        playlists,
        songs,
        videos,
        stations,
        shared,
        vocabulary,
        viewMode,
    ]);

    const renderSectionHeader = useCallback(
        ({ section }: { section: Section }) => (
            <View style={styles.sectionHeader}>
                <SectionTitle>{section.title}</SectionTitle>
            </View>
        ),
        [styles]
    );

    const renderItem = useCallback(
        ({ item, section }: { item: TMedia[]; section: Section }) => {
            if (section.renderType === "grid") {
                return (
                    <View style={styles.gridRow}>
                        {item.map((media) => (
                            <View
                                key={`${media.type}-${isSearchResult(media) ? media.providerUrl : media.publicId}`}
                                style={styles.gridItemWrapper}
                            >
                                <MediaCard media={media} />
                            </View>
                        ))}
                    </View>
                );
            }
            return <MediaRow media={item[0]} />;
        },
        [styles]
    );

    const keyExtractor = useCallback(
        (item: TMedia[], index: number) =>
            `${item[0].type}-${isSearchResult(item[0]) ? item[0].providerUrl : item[0].publicId}-${index}`,
        []
    );

    return (
        <SectionList
            testID="library-scroll"
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={keyExtractor}
            ListHeaderComponent={<>{header}</>}
            ListFooterComponent={<>{footer}</>}
            ListEmptyComponent={
                <Text style={styles.emptyText}>{vocabulary.NO_RESULTS}</Text>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
        />
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        listContent: {
            paddingTop: theme.layout.mobileContentTop,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.layout.mobileContentBottom,
        },
        sectionHeader: {
            marginBottom: theme.spacing.sm,
        },
        gridItemWrapper: {
            flex: 1,
            maxWidth: "50%",
            padding: theme.spacing.xs,
        },
        gridRow: {
            flexDirection: "row",
        },
        emptyContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        emptyText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.label,
        },
    });
