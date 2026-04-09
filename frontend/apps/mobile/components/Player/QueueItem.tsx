import { useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import type { TQueueMedia } from "@rockit/shared";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface QueueItemProps {
    media: TQueueMedia;
    index: number;
    isActive: boolean;
    isDragging?: boolean;
    drag?: () => void;
    onDelete: (index: number) => void;
    onPlay: (media: TQueueMedia, index: number) => void;
}

export default function QueueItem({
    media,
    index,
    isActive,
    isDragging = false,
    drag,
    onDelete,
    onPlay,
}: QueueItemProps) {
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (
        _progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-80, -40],
            outputRange: [1, 0.7],
            extrapolate: "clamp",
        });

        return (
            <Pressable
                style={styles.deleteAction}
                onPress={() => {
                    swipeableRef.current?.close();
                    onDelete(index);
                }}
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Feather name="trash-2" size={22} color="#fff" />
                </Animated.View>
            </Pressable>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            onSwipeableWillOpen={() => onDelete(index)}
            friction={2}
            overshootRight={false}
        >
            <Pressable
                style={[
                    styles.container,
                    isActive && styles.containerActive,
                    isDragging && styles.containerDragging,
                ]}
                onPress={() => onPlay(media, index)}
            >
                <Image
                    source={{ uri: media.imageUrl }}
                    style={[styles.image, isActive && styles.imageActive]}
                    contentFit="cover"
                    transition={200}
                />

                <View style={styles.info}>
                    <Text
                        style={[
                            styles.title,
                            isActive && { color: COLORS.accent },
                        ]}
                        numberOfLines={1}
                    >
                        {media.name}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {media.artists[0]?.name ?? ""}
                    </Text>
                </View>

                <Pressable
                    style={styles.dragHandle}
                    onLongPress={drag}
                    delayLongPress={150}
                    hitSlop={8}
                >
                    <Feather
                        name="menu"
                        size={18}
                        color="rgba(255,255,255,0.35)"
                    />
                </Pressable>
            </Pressable>
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
        backgroundColor: "transparent",
    },
    containerActive: {
        backgroundColor: "rgba(238, 16, 134, 0.08)",
    },
    containerDragging: {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    image: {
        width: 46,
        height: 46,
        borderRadius: 6,
        backgroundColor: COLORS.bgCard,
    },
    imageActive: {
        opacity: 0.6,
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.white,
        marginBottom: 2,
    },
    artist: {
        fontSize: 12,
        color: COLORS.gray400,
    },
    dragHandle: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteAction: {
        backgroundColor: "#c72e2e",
        width: 72,
        alignItems: "center",
        justifyContent: "center",
    },
});
