import { COLORS } from "@/constants/theme";
import { TMedia } from "@rockit/shared";
import { Bookmark, ChevronDown, MoreHorizontal } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import {
    useContextMenu,
    type ContextMenuOption,
} from "@/lib/ContextMenuContext";
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
    const { hide } = useContextMenu();
    const extraOptions: ContextMenuOption[] = [];

    if (onBookmarkPress && media) {
        extraOptions.push({
            label: "Bookmarks",
            icon: Bookmark,
            onPress: () => {
                hide();
                onBookmarkPress();
            },
        });
    }

    return (
        <View style={styles.container}>
            <Pressable style={styles.button} onPress={onClose} hitSlop={12}>
                <ChevronDown size={28} color={COLORS.white} />
            </Pressable>

            {media && (
                <MediaPressableWrapper
                    media={media}
                    allMedia={[media]}
                    extraOptions={extraOptions}
                    menuOnly
                >
                    <MoreHorizontal size={22} color={COLORS.white} />
                </MediaPressableWrapper>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
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
