import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { Bookmark } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { BOOKMARK_MODE_COLORS } from "@/lib/managers/bookmarkManager";
import { rockIt } from "@/lib/rockit/rockIt";

interface BookmarkButtonProps {
    onPress: () => void;
    currentTime: number;
}

export default function BookmarkButton({
    onPress,
    currentTime,
}: BookmarkButtonProps) {
    const $bookmarks = useStore(
        rockIt.bookmarkManager.currentMediaBookmarksAtom
    );

    const existingBookmark = $bookmarks.find(
        (b) => Math.abs(b.timestamp - currentTime) < 0.5
    );
    const dotColor = existingBookmark
        ? (BOOKMARK_MODE_COLORS[existingBookmark.mode] ?? COLORS.white)
        : undefined;

    return (
        <Pressable style={styles.sideButton} onPress={onPress} hitSlop={12}>
            <Bookmark
                size={24}
                color={dotColor ?? "rgba(255,255,255,0.7)"}
                fill={dotColor ? dotColor : "transparent"}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    sideButton: {
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
});
