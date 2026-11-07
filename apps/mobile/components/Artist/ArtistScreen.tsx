import { useStore } from "@nanostores/react";
import type { ArtistPageResponse, TMedia } from "@rockit/shared";
import { MediaArtwork, useDesignTheme } from "@rockit/ui";
import { usePagedSearch } from "@rockit/ui/headless/usePagedSearch";
import { FlatList, Pressable, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { userManager } from "@/lib/managers/userManager";
import { useVocabulary } from "@/lib/vocabulary";
import MediaRow from "@/components/Media/MediaRow";

async function fetchPage(query: string, offset: number, sort: string) {
    const result =
        sort === "name"
            ? await Http.getArtistPageByName(query, offset, 50)
            : await Http.getArtistCatalogPage(query, offset, 50);
    if (!result.isOk()) throw new Error(result.message);
    const page = result.result;
    return {
        metadata: page,
        items: [...page.albums, ...page.songs] as TMedia[],
        total: page.totalAlbums + page.totalSongs,
        nextOffset: offset + 50,
        hasMore: page.hasMore,
    };
}

export default function ArtistScreen({
    identity,
    byName = false,
}: {
    identity: string;
    byName?: boolean;
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const session = useStore(userManager.sessionAtom);
    const result = usePagedSearch<TMedia, ArtistPageResponse>(
        {
            query: identity,
            scope: session?.username ?? "",
            enabled: true,
            sort: byName ? "name" : "id",
        },
        fetchPage
    );
    const artist = result.metadata?.artist;
    return (
        <FlatList
            data={result.items}
            keyExtractor={(item) => `${item.type}:${item.publicId}`}
            renderItem={({ item }) => <MediaRow media={item} />}
            contentContainerStyle={{
                paddingTop: theme.layout.mobileContentTop,
                paddingBottom: theme.layout.mobileContentBottom,
                gap: theme.spacing.sm,
            }}
            initialNumToRender={10}
            windowSize={5}
            maxToRenderPerBatch={10}
            ListHeaderComponent={
                <View
                    style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
                >
                    {artist && (
                        <MediaArtwork
                            uri={artist.imageUrl}
                            label={artist.name}
                            size={theme.layout.artistArtwork}
                            round
                        />
                    )}
                    <Text
                        style={{
                            color: theme.colors.foreground,
                            fontSize: theme.typography.heading,
                        }}
                    >
                        {artist?.name ?? identity}
                    </Text>
                    {result.loading && (
                        <Text
                            style={{ color: theme.colors["muted-foreground"] }}
                        >
                            {vocabulary.ARTIST_LOADING}
                        </Text>
                    )}
                    {result.error && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={result.retry}
                        >
                            <Text style={{ color: theme.colors.destructive }}>
                                {vocabulary.ARTIST_LOAD_ERROR}
                            </Text>
                        </Pressable>
                    )}
                </View>
            }
            ListFooterComponent={
                result.hasMore ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={result.loadMore}
                        disabled={result.loading}
                        style={{ padding: theme.spacing.lg }}
                    >
                        <Text style={{ color: theme.colors.primary }}>
                            {vocabulary.ARTIST_MORE}
                        </Text>
                    </Pressable>
                ) : null
            }
        />
    );
}
