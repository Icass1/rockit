import { useCallback, useMemo, useState, type ReactNode } from "react";
import { isSearchResult, type TMedia } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import {
    FlatList,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useVocabulary } from "@/lib/vocabulary";
import MediaCard from "@/components/Media/MediaCard";

interface LibraryContentProps {
    extraData?: unknown;
    header?: ReactNode;
    footer?: ReactNode;
    items: TMedia[];
}

export default function LibraryContent({
    header,
    extraData,
    footer,
    items,
}: LibraryContentProps) {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
    const { width } = useWindowDimensions();
    const [measuredWidth, setMeasuredWidth] = useState<number>();
    const columns = Math.max(
        2,
        Math.floor(
            ((measuredWidth ?? width) - theme.spacing.lg * 2) /
                theme.layout.libraryCardMinWidth
        )
    );
    const { vocabulary } = useVocabulary();

    const rows = useMemo(() => {
        const result: TMedia[][] = [];
        for (let index = 0; index < items.length; index += columns)
            result.push(items.slice(index, index + columns));
        return result;
    }, [items, columns]);

    const renderItem = useCallback(
        ({ item }: { item: TMedia[] }) => {
            return (
                <View style={styles.gridRow}>
                    {item.map((media) => (
                        <View
                            testID="library-grid-item"
                            key={`${media.type}-${isSearchResult(media) ? media.providerUrl : media.publicId}`}
                            style={[
                                styles.gridItemWrapper,
                                { width: `${100 / columns}%` },
                            ]}
                        >
                            <MediaCard media={media} />
                        </View>
                    ))}
                </View>
            );
        },
        [styles, columns]
    );

    const keyExtractor = useCallback(
        (item: TMedia[], index: number) =>
            `${item[0].type}-${isSearchResult(item[0]) ? item[0].providerUrl : item[0].publicId}-${index}`,
        []
    );

    return (
        <FlatList
            testID="library-scroll"
            onLayout={({ nativeEvent }) =>
                setMeasuredWidth(nativeEvent.layout.width)
            }
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
