import { useCallback, useEffect, useRef, useState } from "react";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import {
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOfflineArtwork } from "@/hooks/useOfflineArtwork";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import FullscreenMediaPlayer from "@/components/Player/FullscreenMediaPlayer";
import PlayerMediaInfo from "@/components/Player/PlayerMediaInfo";
import PlayerTabsBar from "@/components/Player/PlayerTabsBar";
import PlayerTabsPanel from "@/components/Player/PlayerTabsPanel";
import PlayerTopBar from "@/components/Player/PlayerTopBar";

const SPRING_CONFIG = { damping: 50, stiffness: 300, mass: 0.8 };

export type PlayerTab =
    "queue" | "lyrics" | "related" | "crossfade" | "bookmarks" | null;

export default function FullPlayer() {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
    const { height: SCREEN_HEIGHT, width } = useWindowDimensions();
    const OFFSET_Y = SCREEN_HEIGHT + theme.spacing.xxl;
    const {
        currentMedia,
        isPlayerVisible,
        seekTo,
        hidePlayer,
        hasVideo,
        canToggleAudioOnly,
        audioOnly,
        toggleAudioOnly,
    } = usePlayer();
    const imageUrl = useOfflineArtwork(
        currentMedia?.publicId,
        currentMedia?.imageUrl
    );

    const insets = useSafeAreaInsets();
    const containerHeight = SCREEN_HEIGHT - theme.layout.tabBar - insets.bottom;
    const contentTop =
        insets.top + theme.layout.mobileHeaderHeight + theme.spacing.sm;
    const [viewportHeight, setViewportHeight] = useState(containerHeight);
    const [topBarHeight, setTopBarHeight] = useState(
        theme.layout.touchTarget + theme.spacing.lg
    );
    const landscape = width > SCREEN_HEIGHT;
    const translateY = useSharedValue(SCREEN_HEIGHT + 10);
    const isHiding = useSharedValue(false);
    const [keepMounted, setKeepMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<PlayerTab>(null);
    const [mediaFullscreen, setMediaFullscreen] = useState(false);
    const isMediaFullscreen = mediaFullscreen && isPlayerVisible;
    const closeMediaFullscreen = useCallback(
        () => setMediaFullscreen(false),
        []
    );

    useEffect(() => {
        if (!isPlayerVisible) setMediaFullscreen(false);
    }, [isPlayerVisible]);
    const prevVisible = useRef(isPlayerVisible);

    const hidePlayerRef = useRef(hidePlayer);
    hidePlayerRef.current = hidePlayer;

    const onHideComplete = useCallback(() => {
        isHiding.value = false;
        setKeepMounted(false);
        hidePlayerRef.current();
    }, [isHiding]);

    useEffect(() => {
        if (isPlayerVisible && !prevVisible.current) {
            isHiding.value = false;
            setKeepMounted(false);
            translateY.value = withSpring(0, SPRING_CONFIG);
        } else if (!isPlayerVisible && prevVisible.current) {
            isHiding.value = true;
            setKeepMounted(true);
            translateY.value = withTiming(
                OFFSET_Y,
                { duration: 280 },
                (finished) => {
                    "worklet";
                    if (finished) runOnJS(onHideComplete)();
                }
            );
        }
        prevVisible.current = isPlayerVisible;
    }, [isPlayerVisible, translateY, isHiding, onHideComplete, OFFSET_Y]);

    const handleBookmarkPress = useCallback(() => {
        if (currentMedia?.publicId) {
            rockIt.bookmarkManager
                .fetchBookmarksForMediaAsync(currentMedia.publicId)
                .then(() => {
                    setActiveTab("bookmarks");
                });
        }
    }, [currentMedia?.publicId]);

    const handleHide = useCallback(() => {
        if (isHiding.value) return;
        isHiding.value = true;
        setKeepMounted(true);
        prevVisible.current = false;
        translateY.value = withTiming(
            OFFSET_Y,
            { duration: 280 },
            (finished) => {
                "worklet";
                if (finished) runOnJS(onHideComplete)();
            }
        );
    }, [translateY, isHiding, onHideComplete, OFFSET_Y]);

    // Pan-down to dismiss — disabled when a tab panel is open so it doesn't
    // interfere with the panel's own scrolling
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            // Disable pan when a tab panel is open (activeTab != null)
            if (activeTab || landscape) return;
            if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
            // Disable pan when a tab panel is open (activeTab != null)
            if (activeTab || landscape) return;
            const dismiss =
                e.translationY > SCREEN_HEIGHT / 3 || e.velocityY > 800;
            if (dismiss) runOnJS(handleHide)();
            else translateY.value = withSpring(0, SPRING_CONFIG);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const handleTabPress = (tab: PlayerTab) =>
        setActiveTab((prev) => (prev === tab ? null : tab));

    const handleTabPanelClose = useCallback(() => setActiveTab(null), []);

    if (!isPlayerVisible && !keepMounted) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { height: containerHeight },
                animatedStyle,
            ]}
        >
            {/* Blurred album-art background — mirrors old MobilePlayerUI */}
            <Image
                source={imageUrl ? { uri: imageUrl } : null}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={30}
            />
            <View style={styles.overlay} pointerEvents="none" />

            {/* Main content wrapped in pan gesture detector */}
            <GestureDetector gesture={panGesture}>
                <ScrollView
                    style={styles.gestureContent}
                    onLayout={({ nativeEvent }) =>
                        setViewportHeight(nativeEvent.layout.height)
                    }
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.inner,
                            {
                                paddingTop: contentTop,
                                paddingBottom: theme.spacing.lg,
                            },
                        ]}
                    >
                        <PlayerTopBar
                            title={currentMedia?.name ?? ""}
                            onClose={handleHide}
                            onSettings={() =>
                                setActiveTab((prev) =>
                                    prev === "crossfade" ? null : "crossfade"
                                )
                            }
                            onBookmarkPress={handleBookmarkPress}
                            media={currentMedia}
                            onHeightChange={setTopBarHeight}
                        />
                        <PlayerMediaInfo
                            availableHeight={
                                viewportHeight -
                                contentTop -
                                topBarHeight -
                                theme.spacing.lg
                            }
                            currentMedia={currentMedia}
                            onSeek={seekTo}

                            hasVideo={!!hasVideo}
                            canToggleAudioOnly={canToggleAudioOnly}
                            audioOnly={audioOnly}
                            onToggleAudioOnly={toggleAudioOnly}
                            isMediaFullscreen={!!isMediaFullscreen}
                            onMediaFullscreen={() => setMediaFullscreen(true)}
                        />
                    </Animated.View>
                </ScrollView>
            </GestureDetector>

            <PlayerTabsBar
                activeTab={activeTab}
                onTabPress={handleTabPress}
                insetBottom={theme.spacing.md}
            />

            <PlayerTabsPanel
                activeTab={activeTab}
                onClose={handleTabPanelClose}
            />
            {isMediaFullscreen && (
                <FullscreenMediaPlayer onClose={closeMediaFullscreen} />
            )}
        </Animated.View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            // Height will be set dynamically to avoid covering the footer
            zIndex: 0, // default stacking; MiniPlayer is hidden when FullPlayer visible
            backgroundColor: theme.colors["background"],
            overflow: "hidden",
        },
        overlay: {
            ...StyleSheet.absoluteFill,
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.55),
        },
        inner: {
            flex: 1,
        },
        gestureContent: {
            flex: 1,
        },
    });
