import { useRef } from "react";
import { useStore } from "@nanostores/react";
import {
    getMediaArtistsString,
    isDownloadable,
    type TQueueMedia,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import {
    ExplicitBadge,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Menu, Trash2 } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useMediaOffline } from "@/hooks/useMediaOffline";
import { syncManager } from "@/lib/syncManager";
import { useVocabulary } from "@/lib/vocabulary";

/** Width of the swipe-to-delete action revealed behind a queue row. */
const DELETE_WIDTH = 80;

interface QueueItemProps {
    media: TQueueMedia;
    index: number;
    isActive: boolean;
    isDragging?: boolean;
    /** Provide when used inside DraggableFlatList to enable drag-to-reorder */
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
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const swipeableRef = useRef<Swipeable>(null);
    const isSavedOffline = useMediaOffline(media.publicId);
    const isOnline = useStore(syncManager.isOnlineAtom);
    const isNotDownloaded = isOnline
        ? isDownloadable(media) && !media.downloaded
        : !isSavedOffline;

    const renderRightActions = (
        _progress: Animated.AnimatedInterpolation<number>,
        // Live row translation: 0 (closed) → -DELETE_WIDTH (fully dragged).
        translation: Animated.AnimatedInterpolation<number>
    ) => {
        // Trash icon starts off-screen to the right and slides into view as
        // the row is dragged left.
        const translateX = translation.interpolate({
            inputRange: [-DELETE_WIDTH, 0],
            outputRange: [0, DELETE_WIDTH],
            extrapolate: "clamp",
        });

        return (
            <View style={styles.deleteAction}>
                <Animated.View style={{ transform: [{ translateX }] }}>
                    <View style={styles.trashIconContainer}>
                        <Trash2
                            size={22}
                            color={theme.colors["foreground-strong"]}
                        />
                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            // Require a deliberate drag past most of the action (or a quick
            // flick — release velocity is factored in) before deleting, so
            // scrolling doesn't accidentally remove items.
            rightThreshold={DELETE_WIDTH * 0.75}
            dragOffsetFromRightEdge={20}
            onSwipeableWillOpen={() => onDelete(index)}
            friction={2}
            overshootRight={false}
        >
            <Pressable
                style={[
                    styles.container,
                    isActive && styles.containerActive,
                    isDragging && styles.containerDragging,
                    isNotDownloaded && styles.containerNotDownloaded,
                ]}
                onPress={() => onPlay(media, index)}
            >
                <Image
                    source={{ uri: media.imageUrl }}
                    style={[
                        styles.image,
                        isActive && styles.imageActive,
                        isNotDownloaded && styles.imageNotDownloaded,
                    ]}
                    contentFit="cover"
                    transition={200}
                />

                <View style={styles.info}>
                    <Text
                        style={[
                            styles.title,
                            isActive && { color: theme.legacy.accent },
                            isNotDownloaded && styles.titleNotDownloaded,
                        ]}
                        numberOfLines={1}
                    >
                        {media.name}
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: theme.spacing.xs,
                        }}
                    >
                        <ExplicitBadge
                            explicit={
                                media.type === "song" ? media.explicit : null
                            }
                            label={vocabulary.CONTENT_RATING_EXPLICIT}
                        />
                        <Text
                            style={[
                                styles.artist,
                                isNotDownloaded && styles.artistNotDownloaded,
                            ]}
                            numberOfLines={1}
                        >
                            {getMediaArtistsString(media)}
                        </Text>
                    </View>
                </View>

                {/* Drag handle — only active when drag prop is provided */}
                {drag && (
                    <Pressable
                        style={styles.dragHandle}
                        onLongPress={drag}
                        delayLongPress={150}
                        hitSlop={8}
                    >
                        <Menu
                            size={18}
                            color={withAlpha(
                                theme.colors["foreground-strong"],
                                0.35
                            )}
                        />
                    </Pressable>
                )}
            </Pressable>
        </Swipeable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
            gap: theme.spacing.md,
            backgroundColor: "transparent",
        },
        containerActive: {
            backgroundColor: withAlpha(theme.colors["primary"], 0.08),
        },
        containerDragging: {
            backgroundColor: withAlpha(theme.colors["foreground-strong"], 0.06),
            borderRadius: theme.radius.lg,
            shadowColor: theme.colors["backdrop"],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
        },
        image: {
            width: 46,
            height: 46,
            borderRadius: 6,
            backgroundColor: theme.legacy.bgCard,
        },
        imageActive: {
            opacity: 0.6,
        },
        containerNotDownloaded: {
            opacity: 0.4,
        },
        imageNotDownloaded: {
            opacity: 0.5,
        },
        titleNotDownloaded: {
            color: theme.legacy.gray600,
        },
        artistNotDownloaded: {
            color: theme.legacy.gray800,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.white,
            marginBottom: 2,
        },
        artist: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray400,
        },
        dragHandle: {
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
        },
        deleteAction: {
            width: DELETE_WIDTH,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
        },
        trashIconContainer: {
            width: DELETE_WIDTH,
            height: DELETE_WIDTH,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors["destructive"],
        },
    });
