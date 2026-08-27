import { useEffect, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { EQueueType, type TQueueMedia } from "@rockit/shared";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import QueueItem from "@/components/Player/QueueItem";

/** Fixed height of a QueueItem row (46px image + 2×10 vertical padding). */
const ITEM_HEIGHT = 66;

/**
 * PlayerQueue — inline queue list rendered inside the tabs panel.
 * Replaces the old BottomSheet + DraggableFlatList implementation.
 * Swipe-to-delete still works via the Swipeable in QueueItem.
 * Drag-to-reorder is a TODO once DraggableFlatList is re-integrated.
 */
export default function PlayerQueue() {
    const {
        queue,
        currentMedia,
        removeFromQueue,
        playMedia,
        queueType,
        originalQueue,
    } = usePlayer();

    const $autoplay = useStore(rockIt.queueManager.autoplayAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const listRef = useRef<FlatList<TQueueMedia>>(null);
    const currentIndex =
        queue?.findIndex((m) => m.publicId === currentMedia?.publicId) ?? -1;

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
                <Text style={styles.emptyText}>Your queue is empty</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Queue</Text>
                <Text style={styles.headerCount}>{queue.length} songs</Text>
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
                                {$vocabulary.AUTOPLAY_ON}
                            </Text>
                            {$autoplay.map((media) => (
                                <QueueItem
                                    key={media.publicId}
                                    media={media}
                                    // Not part of the queue yet: it has no
                                    // index to remove, and tapping queues it
                                    // next rather than jumping to it.
                                    index={-1}
                                    isActive={false}
                                    onDelete={(): void => undefined}
                                    onPlay={(m: TQueueMedia): void =>
                                        rockIt.queueManager.addMediaNext(m)
                                    }
                                />
                            ))}
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    headerCount: {
        fontSize: 14,
        color: COLORS.gray400,
    },
    list: {
        paddingBottom: 40,
    },
    autoplayHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray400,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.1)",
        marginTop: 8,
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.gray400,
    },
});
