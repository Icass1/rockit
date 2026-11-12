import { TMedia } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Bookmark, ChevronDown, MoreHorizontal } from "@rockit/ui/icons";
import { Pressable, StyleSheet, View } from "react-native";
import {
    useContextMenu,
    type ContextMenuOption,
} from "@/lib/ContextMenuContext";
import { useVocabulary } from "@/lib/vocabulary";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

interface PlayerTopBarProps {
    title: string;
    onClose: () => void;
    onSettings: () => void;
    onQueue?: () => void;
    onLyrics?: () => void;
    onRelated?: () => void;
    onBookmarkPress?: () => void;
    media?: TMedia; // current media object for context menu
}

export default function PlayerTopBar({
    title,
    onClose,
    onSettings,
    onQueue,
    onLyrics,
    onRelated,
    onBookmarkPress,
    media,
}: PlayerTopBarProps) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { hide } = useContextMenu();
    const extraOptions: ContextMenuOption[] = [];

    if (onBookmarkPress && media) {
        extraOptions.push({
            label: vocabulary.BOOKMARKS,
            icon: Bookmark,
            onPress: () => {
                hide();
                onBookmarkPress();
            },
        });
    }

    return (
        <View testID="player-top-bar" style={styles.container}>
            <Pressable
                style={styles.button}
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={vocabulary.MOBILE_CLOSE}
            >
                <ChevronDown size={28} color={theme.legacy.white} />
            </Pressable>

            {media && (
                <MediaPressableWrapper
                    media={media}
                    allMedia={[media]}
                    extraOptions={extraOptions}
                    menuOnly
                >
                    <MoreHorizontal size={22} color={theme.legacy.white} />
                </MediaPressableWrapper>
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
            backgroundColor: "transparent",
            zIndex: 5,
        },
        button: {
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
        },
    });
