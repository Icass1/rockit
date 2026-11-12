import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { ERepeatMode, type QueueMediaItem } from "@rockit/shared";
import { designTokens, withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { usePlayer, usePlayerServices } from "@/lib/PlayerContext";
import QueueItem from "@/components/Player/QueueItem";
import { RecommendationRow } from "@/components/Recommendations/AutoplayDiscovery";

const ITEM_HEIGHT = designTokens.layout.queueRowHeight;

/** Queue identity survives duplicate songs, loaded pages and row selection. */
export default function PlayerQueue() {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
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
    const listRef = useRef<Pick<
        FlatList<QueueMediaItem>,
        "scrollToIndex" | "scrollToOffset"
    > | null>(null);
    const dragSnapshot = useRef<{ identity: object; ids: number[] } | null>(
        null
    );
    const host = useRef<View>(null);
    const offset = useRef(0);
    const dragStartOffset = useRef(0);
    const pointer = useRef({ dy: 0, y: 0, top: 0, bottom: 0 });
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [reordering, setReordering] = useState(false);
    useEffect(() => {
        if (dragIndex === null) return;
        const timer = setInterval(() => {
            const p = pointer.current;
            const direction =
                p.y > p.bottom - ITEM_HEIGHT
                    ? 1
                    : p.y < p.top + ITEM_HEIGHT
                      ? -1
                      : 0;
            if (!direction) return;
            const next = Math.max(0, offset.current + direction * 16);
            listRef.current?.scrollToOffset({ offset: next, animated: false });
            setDropIndex(
                Math.max(
                    0,
                    Math.min(
                        queueItems.length - 1,
                        dragIndex +
                            Math.round(
                                (p.dy +
                                    offset.current -
                                    dragStartOffset.current) /
                                    ITEM_HEIGHT
                            )
                    )
                )
            );
        }, 80);
        return () => clearInterval(timer);
    }, [dragIndex, queueItems.length]);
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
        <View ref={host} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{vocabulary.QUEUE}</Text>
                <Text style={styles.headerCount}>
                    {services.queueManager.queueTotalCount} {vocabulary.SONGS}
                </Text>
            </View>
            <FlatList
                ref={(instance) => {
                    listRef.current = instance;
                }}
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
                scrollEnabled={dragIndex === null}
                onScroll={(event) => {
                    offset.current = event.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                    <View
                        style={
                            dropIndex === index && dragIndex !== index
                                ? {
                                      borderTopWidth: 2,
                                      borderTopColor: theme.colors.primary,
                                  }
                                : undefined
                        }
                    >
                        <QueueItem
                            media={item.media}
                            index={index}
                            drag={
                                reordering
                                    ? undefined
                                    : () => {
                                          dragSnapshot.current = {
                                              identity:
                                                  services.queueManager
                                                      .queueIdentity,
                                              ids: queueItems.map(
                                                  (item) => item.queueMediaId
                                              ),
                                          };
                                          dragStartOffset.current =
                                              offset.current;
                                          pointer.current.dy = 0;
                                          host.current?.measureInWindow(
                                              (x, y, w, h) => {
                                                  pointer.current.top = y;
                                                  pointer.current.bottom =
                                                      y + h;
                                                  pointer.current.y = y + h / 2;
                                              }
                                          );
                                          setDragIndex(index);
                                      }
                            }
                            onDragMove={(dy, y) => {
                                pointer.current.dy = dy;
                                pointer.current.y = y;
                                setDropIndex(
                                    Math.max(
                                        0,
                                        Math.min(
                                            queueItems.length - 1,
                                            index +
                                                Math.round(
                                                    (dy +
                                                        offset.current -
                                                        dragStartOffset.current) /
                                                        ITEM_HEIGHT
                                                )
                                        )
                                    )
                                );
                            }}
                            onDragEnd={(dy) => {
                                const snapshot = dragSnapshot.current;
                                dragSnapshot.current = null;
                                setDragIndex(null);
                                setDropIndex(null);
                                if (dy === null) return;
                                const to = Math.max(
                                    0,
                                    Math.min(
                                        queueItems.length - 1,
                                        index +
                                            Math.round(
                                                (dy +
                                                    offset.current -
                                                    dragStartOffset.current) /
                                                    ITEM_HEIGHT
                                            )
                                    )
                                );
                                if (
                                    !snapshot ||
                                    snapshot.identity !==
                                        services.queueManager.queueIdentity ||
                                    to === index
                                )
                                    return;
                                setReordering(true);
                                void services.queueManager
                                    .reorderQueueItemsAsync(
                                        snapshot.ids[index],
                                        snapshot.ids[to]
                                    )
                                    .finally(() => setReordering(false));
                            }}
                            isDragging={dragIndex === index}
                            isActive={item.queueMediaId === currentQueueMediaId}
                            onDelete={removeFromQueue}
                            onPlay={() => playQueueItem(item.queueMediaId)}
                        />
                    </View>
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
