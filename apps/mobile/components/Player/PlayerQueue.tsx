import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { EQueueType, ERepeatMode, type TQueueMedia } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/lib/vocabulary";
import QueueItem from "@/components/Player/QueueItem";
import { RecommendationRow } from "@/components/Recommendations/AutoplayDiscovery";

/** Fixed height of a QueueItem row (46px image + 2×10 vertical padding). */
const ITEM_HEIGHT = 66;

/**
 * PlayerQueue — inline queue list rendered inside the tabs panel.
 * Replaces the old BottomSheet + DraggableFlatList implementation.
 * Swipe-to-delete still works via the Swipeable in QueueItem.
 * Drag-to-reorder is a TODO once DraggableFlatList is re-integrated.
 */
export default function PlayerQueue() {
    const styles = useThemedStyles(createStyles);
    const {
        queue,
        currentMedia,
        removeFromQueue,
        playMedia,
        queueType,
        originalQueue,
    } = usePlayer();

    const $autoplay = useStore(rockIt.queueManager.autoplayRecommendationsAtom);
    const repeat = useStore(rockIt.userManager.repeatModeAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const listRef = useRef<FlatList<TQueueMedia>>(null);
    const currentIndex =
        queue?.findIndex((m) => m.publicId === currentMedia?.publicId) ?? -1;

    useEffect(() => {
        void rockIt.queueManager.loadAutoplaySuggestionsAsync();
    }, [currentMedia?.publicId]);

    // On open (the panel remounts this component each time the queue tab shows),
    // center the currently-playing item so the user lands on it.
    useEffect(() => {
        if (currentIndex <= 0) return;
        const id = setTimeout(() => {
            listRef.current?.scrollToIndex({
                index: currentIndex,
                viewPosition: 0.5,
                animated: false,
            });
        }, 0);
        return () => clearTimeout(id);
        // Only run on mount — we intentionally scroll once when the queue opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!queue || queue.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>
                    {$vocabulary.MOBILE_QUEUE_EMPTY}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{$vocabulary.QUEUE}</Text>
                <Text style={styles.headerCount}>
                    {queue.length} {$vocabulary.SONGS}
                </Text>
            </View>

            <FlatList
                ref={listRef}
                data={queue}
                keyExtractor={(item, index) => `${item.publicId}-${index}`}
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
                onScrollToIndexFailed={({ index }) => {
                    // Fallback if layout isn't ready — approximate by offset.
                    listRef.current?.scrollToOffset({
                        offset: ITEM_HEIGHT * index,
                        animated: false,
                    });
                }}
                renderItem={({ item, index }) => (
                    <QueueItem
                        media={item}
                        index={index}
                        isActive={item.publicId === currentMedia?.publicId}
                        onDelete={(idx) => removeFromQueue(idx)}
                        onPlay={(media: TQueueMedia) => {
                            const sortedQueue =
                                queueType === EQueueType.RANDOM &&
                                originalQueue.length > 0
                                    ? originalQueue
                                    : queue;
                            playMedia(media, sortedQueue);
                        }}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                    $autoplay.length > 0 ? (
                        <View>
                            <Text style={styles.autoplayHeader}>
                                {repeat === ERepeatMode.OFF
                                    ? $vocabulary.AUTOPLAY_ON
                                    : $vocabulary.RECOMMENDED_SONGS}
                            </Text>
                            {$autoplay.map((entry, index) => (
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
