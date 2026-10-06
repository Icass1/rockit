import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { VideoView, type VideoPlayer } from "expo-video";
import {
    Bookmark,
    Minimize,
    Pause,
    Play,
    RotateCcw,
    RotateCw,
    SkipBack,
    SkipForward,
} from "lucide-react-native";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useVideoFullscreen } from "@/lib/hooks/useVideoFullscreen";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import BookmarkPopup from "@/components/Player/BookmarkPopup";
import PlayerProgress from "@/components/Player/PlayerProgress";

interface FullscreenVideoPlayerProps {
    videoPlayer: VideoPlayer;
    onClose: () => void;
}

export default function FullscreenVideoPlayer(
    props: FullscreenVideoPlayerProps
) {
    const [bookmarksVisible, setBookmarksVisible] = useState(false);
    return (
        <Modal
            animationType="none"
            presentationStyle="fullScreen"
            supportedOrientations={[
                "portrait",
                "landscape-left",
                "landscape-right",
            ]}
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={
                bookmarksVisible
                    ? () => setBookmarksVisible(false)
                    : props.onClose
            }
        >
            <SafeAreaProvider>
                <FullscreenVideoContent
                    {...props}
                    bookmarksVisible={bookmarksVisible}
                    onBookmarksChange={setBookmarksVisible}
                />
            </SafeAreaProvider>
        </Modal>
    );
}

interface FullscreenVideoContentProps extends FullscreenVideoPlayerProps {
    bookmarksVisible: boolean;
    onBookmarksChange: (visible: boolean) => void;
}

function FullscreenVideoContent({
    videoPlayer,
    onClose,
    bookmarksVisible,
    onBookmarksChange,
}: FullscreenVideoContentProps) {
    useVideoFullscreen(onClose);
    const {
        currentMedia,
        isPlaying,
        isLoading,
        togglePlayPause,
        seekTo,
        skipBack,
        skipForward,
    } = usePlayer();
    const { duration } = usePlayerTime();
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const insets = useSafeAreaInsets();
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isSeeking, setIsSeeking] = useState(false);
    const [interaction, setInteraction] = useState(0);
    const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTapOffset = useRef<number | null>(null);

    const cancelPendingTap = () => {
        if (tapTimeout.current !== null) clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
        lastTapOffset.current = null;
    };

    useEffect(() => cancelPendingTap, [currentMedia?.publicId]);

    const revealControls = () => {
        cancelPendingTap();
        setControlsVisible(true);
        setInteraction((value) => value + 1);
    };

    useEffect(() => {
        if (
            !controlsVisible ||
            !isPlaying ||
            isLoading ||
            isSeeking ||
            bookmarksVisible
        )
            return;
        const timeout = setTimeout(() => setControlsVisible(false), 3000);
        return () => clearTimeout(timeout);
    }, [
        controlsVisible,
        isPlaying,
        isLoading,
        isSeeking,
        bookmarksVisible,
        interaction,
    ]);

    const handlePlayPause = () => {
        revealControls();
        void togglePlayPause();
    };

    const skipSeconds = (offset: number) => {
        revealControls();
        if (duration <= 0) return;
        const time = rockIt.mediaPlayerManager.currentTimeAtom.get();
        void seekTo(Math.max(0, Math.min(duration, time + offset)));
    };

    const handleSurfaceTap = (offset: number) => {
        if (tapTimeout.current !== null && lastTapOffset.current === offset) {
            skipSeconds(offset);
            return;
        }
        cancelPendingTap();
        lastTapOffset.current = offset;
        // Wait for a possible second tap before changing the overlay's hit targets.
        tapTimeout.current = setTimeout(() => {
            tapTimeout.current = null;
            lastTapOffset.current = null;
            setControlsVisible((visible) => !visible);
            setInteraction((value) => value + 1);
        }, 300);
    };

    const closeBookmarks = () => {
        onBookmarksChange(false);
        revealControls();
    };

    return (
        <View style={styles.container}>
            <VideoView
                player={videoPlayer}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
                surfaceType="textureView"
            />
            <View style={styles.tapSurface} pointerEvents="box-none">
                <Pressable
                    style={styles.tapRegion}
                    onPress={() => handleSurfaceTap(-2)}
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.PLAYER_SHOW_CONTROLS}
                />
                <Pressable
                    style={styles.tapRegion}
                    onPress={() => handleSurfaceTap(10)}
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.PLAYER_SHOW_CONTROLS}
                />
            </View>
            {(controlsVisible || isLoading) && !bookmarksVisible && (
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.controls,
                        {
                            paddingTop: Math.max(insets.top, 12),
                            paddingBottom: Math.max(insets.bottom, 12),
                            paddingLeft: Math.max(insets.left, 20),
                            paddingRight: Math.max(insets.right, 20),
                        },
                    ]}
                >
                    <View style={styles.topBar}>
                        <Text style={styles.title} numberOfLines={1}>
                            {currentMedia?.name}
                        </Text>
                        <Pressable
                            style={styles.button}
                            accessibilityRole="button"
                            accessibilityLabel={vocabulary.BOOKMARKS}
                            onPress={() => {
                                cancelPendingTap();
                                onBookmarksChange(true);
                            }}
                        >
                            <Bookmark size={24} color={COLORS.white} />
                        </Pressable>
                        <Pressable
                            style={styles.button}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel={
                                vocabulary.PLAYER_EXIT_FULLSCREEN
                            }
                        >
                            <Minimize size={24} color={COLORS.white} />
                        </Pressable>
                    </View>
                    <View
                        pointerEvents="box-none"
                        style={styles.centerControls}
                    >
                        <Pressable
                            style={styles.button}
                            onPress={() => {
                                revealControls();
                                void skipBack();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={vocabulary.PREVIOUS_MEDIA}
                        >
                            <SkipBack size={28} color={COLORS.white} />
                        </Pressable>
                        <Pressable
                            style={styles.seekButton}
                            onPress={() => skipSeconds(-10)}
                            disabled={duration <= 0}
                            accessibilityRole="button"
                            accessibilityLabel={
                                vocabulary.PLAYER_REWIND_TEN_SECONDS
                            }
                        >
                            <RotateCcw size={28} color={COLORS.white} />
                            <Text style={styles.seekLabel}>10</Text>
                        </Pressable>
                        <Pressable
                            style={styles.playButton}
                            onPress={handlePlayPause}
                            accessibilityRole="button"
                            accessibilityLabel={
                                isPlaying ? vocabulary.PAUSE : vocabulary.PLAY
                            }
                        >
                            {isLoading ? (
                                <ActivityIndicator
                                    size="large"
                                    color={COLORS.white}
                                    pointerEvents="none"
                                />
                            ) : isPlaying ? (
                                <Pause
                                    size={42}
                                    color={COLORS.white}
                                    fill={COLORS.white}
                                />
                            ) : (
                                <Play
                                    size={42}
                                    color={COLORS.white}
                                    fill={COLORS.white}
                                />
                            )}
                        </Pressable>
                        <Pressable
                            style={styles.seekButton}
                            onPress={() => skipSeconds(10)}
                            disabled={duration <= 0}
                            accessibilityRole="button"
                            accessibilityLabel={
                                vocabulary.PLAYER_FORWARD_TEN_SECONDS
                            }
                        >
                            <RotateCw size={28} color={COLORS.white} />
                            <Text style={styles.seekLabel}>10</Text>
                        </Pressable>
                        <Pressable
                            style={styles.button}
                            onPress={() => {
                                revealControls();
                                void skipForward();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={vocabulary.NEXT_MEDIA}
                        >
                            <SkipForward size={28} color={COLORS.white} />
                        </Pressable>
                    </View>
                    <View style={styles.progress}>
                        <PlayerProgress
                            key={currentMedia?.publicId}
                            onSeek={(seconds) => {
                                revealControls();
                                void seekTo(seconds);
                            }}
                            onSeekingChange={setIsSeeking}
                        />
                    </View>
                </View>
            )}
            {bookmarksVisible && (
                <View style={StyleSheet.absoluteFill}>
                    <Pressable
                        style={styles.bookmarkScrim}
                        onPress={closeBookmarks}
                        accessibilityRole="button"
                        accessibilityLabel={vocabulary.PLAYER_CLOSE_BOOKMARKS}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={[
                            styles.bookmarkPanel,
                            {
                                paddingTop: Math.max(insets.top, 8),
                                paddingRight: insets.right,
                            },
                        ]}
                    >
                        <BookmarkPopup
                            key={currentMedia?.publicId}
                            standalone
                            onClose={closeBookmarks}
                        />
                    </KeyboardAvoidingView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    tapSurface: { ...StyleSheet.absoluteFill, flexDirection: "row" },
    tapRegion: { flex: 1 },
    controls: {
        ...StyleSheet.absoluteFill,
        justifyContent: "space-between",
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    topBar: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { flex: 1, color: COLORS.white, fontSize: 18, fontWeight: "600" },
    button: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    centerControls: {
        ...StyleSheet.absoluteFill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    playButton: {
        width: 72,
        height: 72,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 36,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    seekButton: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    seekLabel: { color: COLORS.white, fontSize: 12, marginTop: 2 },
    progress: {
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    bookmarkScrim: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    bookmarkPanel: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "50%",
        maxWidth: 400,
        backgroundColor: COLORS.bgCard,
    },
});
