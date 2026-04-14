import { FlatList, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/theme";
import { usePlayer } from "@/lib/PlayerContext";
import QueueItem from "./QueueItem";
import type { TQueueMedia } from "@rockit/shared";

/**
 * PlayerQueue — inline queue list rendered inside the tabs panel.
 * Replaces the old BottomSheet + DraggableFlatList implementation.
 * Swipe-to-delete still works via the Swipeable in QueueItem.
 * Drag-to-reorder is a TODO once DraggableFlatList is re-integrated.
 */
export default function PlayerQueue() {
    const { queue, currentMedia, removeFromQueue, playMedia } = usePlayer();

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
                data={queue}
                keyExtractor={(item) => item.publicId}
                renderItem={({ item, index }) => (
                    <QueueItem
                        media={item}
                        index={index}
                        isActive={item.publicId === currentMedia?.publicId}
                        onDelete={(idx) => removeFromQueue(idx)}
                        onPlay={(media: TQueueMedia) =>
                            playMedia(media, queue)
                        }
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
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
