import { COLORS } from "@/constants/theme";
import { TMedia } from "@rockit/shared";
import { ChevronDown, MoreHorizontal } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

interface PlayerTopBarProps {
    title: string;
    onClose: () => void;
    onSettings: () => void;
    onQueue?: () => void;
    onLyrics?: () => void;
    onRelated?: () => void;
    media?: TMedia; // current media object for context menu
}

export default function PlayerTopBar({
    title,
    onClose,
    onSettings,
    onQueue,
    onLyrics,
    onRelated,
    media,
}: PlayerTopBarProps) {
    return (
        <View style={styles.container}>
            <Pressable style={styles.button} onPress={onClose} hitSlop={12}>
                <ChevronDown size={28} color={COLORS.white} />
            </Pressable>

            {media && (
                <MediaPressableWrapper media={media} allMedia={[media]}>
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
    rightContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        flex: 1,
        textAlign: "center",
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255,255,255,0.85)",
        marginHorizontal: 8,
    },
});
