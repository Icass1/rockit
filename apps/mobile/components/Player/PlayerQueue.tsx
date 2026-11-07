import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { ERepeatMode, type QueueMediaItem } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer, usePlayerServices } from "@/lib/PlayerContext";
import QueueItem from "@/components/Player/QueueItem";
import { RecommendationRow } from "@/components/Recommendations/AutoplayDiscovery";

const ITEM_HEIGHT = 66;

/** Queue identity survives duplicate songs, loaded pages and row selection. */
export default function PlayerQueue() {
    const styles = useThemedStyles(createStyles);
    const services = usePlayerServices();
    const {
        queueItems,
        currentMedia,
        currentQueueMediaId,
        removeFromQueue,
        playQueueItem,
        currentIndex,
    } = usePlayer();
    const autoplay = useStore(
        services.queueManager.autoplayRecommendationsAtom
    );
    const repeat = useStore(services.userManager.repeatModeAtom);
    const vocabulary = useStore(services.vocabularyManager.vocabularyAtom);
    const listRef = useRef<FlatList<QueueMediaItem>>(null);
    const [initialIndex] = useState(currentIndex);
    useEffect(() => {
        void services.queueManager.loadAutoplaySuggestionsAsync();
    }, [currentMedia?.publicId, services]);
    useEffect(() => {
        if (initialIndex <= 0) return;
        const timer = setTimeout(
            () =>
                listRef.current?.scrollToIndex({
                    index: initialIndex,
                    viewPosition: 0.5,
                    animated: false,
                }),
            0
        );
        return () => clearTimeout(timer);
    }, [initialIndex]);
    if (!queueItems.length)
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>
                    {vocabulary.MOBILE_QUEUE_EMPTY}
                </Text>
            </View>
        );
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{vocabulary.QUEUE}</Text>
                <Text style={styles.headerCount}>
                    {services.queueManager.queueTotalCount} {vocabulary.SONGS}
                </Text>
            </View>
            <FlatList
                ref={listRef}
                data={queueItems}
                keyExtractor={(item) => String(item.queueMediaId)}
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
                onScrollToIndexFailed={({ index }) =>
                    listRef.current?.scrollToOffset({
                        offset: ITEM_HEIGHT * index,
                        animated: false,
                    })
                }
                onEndReached={() => {
                    if (services.queueManager.hasNextQueuePage)
                        void services.queueManager.loadNextQueuePageAsync();
                }}
                onEndReachedThreshold={0.5}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                renderItem={({ item, index }) => (
                    <QueueItem
                        media={item.media}
                        index={index}
                        isActive={item.queueMediaId === currentQueueMediaId}
                        onDelete={removeFromQueue}
                        onPlay={() => playQueueItem(item.queueMediaId)}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    services.queueManager.hasPreviousQueuePage ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                                void services.queueManager.loadPreviousQueuePageAsync()
                            }
                        >
                            <Text style={styles.autoplayHeader}>
                                {vocabulary.QUEUE_LOAD_PREVIOUS}
                            </Text>
                        </Pressable>
                    ) : null
                }
                ListFooterComponent={
                    !services.queueManager.hasNextQueuePage &&
                    autoplay.length ? (
                        <View>
                            <Text style={styles.autoplayHeader}>
                                {repeat === ERepeatMode.OFF
                                    ? vocabulary.AUTOPLAY_ON
                                    : vocabulary.RECOMMENDED_SONGS}
                            </Text>
                            {autoplay.map((entry, index) => (
                                <RecommendationRow
                                    key={
                                        entry.kind === "song"
                                            ? entry.song.publicId
                                            : `discover-${index}`
                                    }
                                    entry={entry}
                                />
                            ))}
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: withAlpha(
                theme.colors["foreground-strong"],
                0.1
            ),
        },
        headerTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        headerCount: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray400,
        },
        list: {
            paddingBottom: theme.spacing.page,
        },
        autoplayHeader: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.gray400,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.sm,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: withAlpha(theme.colors["foreground-strong"], 0.1),
            marginTop: theme.spacing.sm,
        },
        empty: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyText: {
            fontSize: theme.typography.label,
            color: theme.legacy.gray400,
        },
    });
