import { useStore } from "@nanostores/react";
import { getBookmarkColors, withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Bookmark } from "@rockit/ui/icons";
import { Pressable, StyleSheet } from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";

interface BookmarkButtonProps {
    onPress: () => void;
    currentTime: number;
}

export default function BookmarkButton({
    onPress,
    currentTime,
}: BookmarkButtonProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );

    const existingBookmark = $bookmarks.find(
        (b) => Math.abs(b.timestamp - currentTime) < 0.5
    );
    const dotColor = existingBookmark
        ? (getBookmarkColors(theme.mode)[existingBookmark.mode] ??
          theme.legacy.white)
        : undefined;

    return (
        <Pressable style={styles.sideButton} onPress={onPress} hitSlop={12}>
            <Bookmark
                size={24}
                color={
                    dotColor ??
                    withAlpha(theme.colors["foreground-strong"], 0.7)
                }
                fill={dotColor ? dotColor : "transparent"}
            />
        </Pressable>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        sideButton: {
            width: 52,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
        },
    });
