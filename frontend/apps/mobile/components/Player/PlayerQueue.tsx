import { useCallback, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { TQueueMedia } from "@rockit/shared";
import { StyleSheet } from "react-native";
import { type RenderItemParams } from "react-native-draggable-flatlist";
import { usePlayer } from "@/lib/PlayerContext";
import QueueItem from "./QueueItem";

interface PlayerQueueProps {
    sheetRef: React.RefObject<any>;
}

export default function PlayerQueue({ sheetRef }: PlayerQueueProps) {
    const { queue, currentMedia, removeFromQueue, reorderQueue, playMedia } =
        usePlayer();

    const snapPoints = useMemo(() => ["50%", "92%"], []);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const renderItem = useCallback(
        ({ item, getIndex, drag, isActive }: RenderItemParams<TQueueMedia>) => {
            const index = getIndex() ?? 0;
            return (
                <QueueItem
                    media={item}
                    index={index}
                    isActive={item.publicId === currentMedia?.publicId}
                    isDragging={isActive}
                    drag={drag}
                    onDelete={removeFromQueue}
                    onPlay={(media) => {
                        playMedia(media, queue);
                    }}
                />
            );
        },
        [currentMedia, removeFromQueue, playMedia, queue]
    );

    const handleDragEnd = useCallback(
        ({ from, to }: { from: number; to: number }) => {
            reorderQueue(from, to);
        },
        [reorderQueue]
    );

    return null;

    // return (
    //     <BottomSheet
    //         ref={sheetRef}
    //         index={-1}
    //         snapPoints={snapPoints}
    //         enablePanDownToClose
    //         backdropComponent={renderBackdrop}
    //         backgroundStyle={styles.background}
    //         handleIndicatorStyle={styles.handle}
    //         containerStyle={{ zIndex: 200, elevation: 200 }}
    //     >
    //         <View style={styles.header}>
    //             <Text style={styles.headerTitle}>Queue</Text>
    //             <Text style={styles.headerCount}>{queue.length} songs</Text>
    //         </View>

    //         <View style={styles.listContainer}>
    //             <DraggableFlatList
    //                 data={queue}
    //                 keyExtractor={(item) => item.publicId}
    //                 renderItem={renderItem}
    //                 onDragEnd={handleDragEnd}
    //                 autoscrollThreshold={50}
    //                 activationDistance={10}
    //                 contentContainerStyle={styles.listContent}
    //                 showsVerticalScrollIndicator={false}
    //             />
    //         </View>
    //     </BottomSheet>
    // );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: "#1c1c1e",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        backgroundColor: "rgba(255,255,255,0.25)",
        width: 36,
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
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
});
