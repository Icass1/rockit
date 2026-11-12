import { useCallback, useMemo, type ReactNode } from "react";
import { isSearchResult, type TMedia } from "@rockit/shared";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import MediaCard from "@/components/Media/MediaCard";
import MediaRow from "@/components/Media/MediaRow";

interface LibraryContentProps {
    extraData?: unknown;
    header?: ReactNode;
    footer?: ReactNode;
    items: TMedia[];
    viewMode: "grid" | "list";
}

export default function LibraryContent({
    header,
    extraData,
    footer,
    items,
    viewMode,
}: LibraryContentProps) {
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();

    const rows = useMemo(() => {
        const result: TMedia[][] = [];
        const columns = viewMode === "grid" ? 2 : 1;
        for (let index = 0; index < items.length; index += columns)
            result.push(items.slice(index, index + columns));
        return result;
    }, [items, viewMode]);

    const renderItem = useCallback(
        ({ item }: { item: TMedia[] }) => {
            if (viewMode === "grid") {
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
        [styles, viewMode]
    );

    const keyExtractor = useCallback(
        (item: TMedia[], index: number) =>
            `${item[0].type}-${isSearchResult(item[0]) ? item[0].providerUrl : item[0].publicId}-${index}`,
        []
    );

    return (
        <FlatList
            testID="library-scroll"
            extraData={extraData}
            data={rows}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={<>{header}</>}
            ListFooterComponent={<>{footer}</>}
            ListEmptyComponent={
                <Text style={styles.emptyText}>{vocabulary.NO_RESULTS}</Text>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
            paddingBottom: theme.spacing.lg,
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
