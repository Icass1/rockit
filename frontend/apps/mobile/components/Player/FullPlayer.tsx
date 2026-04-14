import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "@/lib/PlayerContext";
import PlayerBottomSheet from "./PlayerBottomSheet";
import PlayerSongInfo from "./PlayerSongInfo";
import PlayerTabsBar from "./PlayerTabsBar";
import PlayerTopBar from "./PlayerTopBar";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPRING_CONFIG = { damping: 50, stiffness: 300, mass: 0.8 };
const OFFSET_Y = SCREEN_HEIGHT + 50;

export type PlayerTab = "queue" | "lyrics" | "related" | "crossfade" | null;

export default function FullPlayer() {
    const {
        currentMedia,
        isPlayerVisible,
        seekTo,
        hidePlayer,
        videoPlayer,
        hasVideo,
    } = usePlayer();

    const insets = useSafeAreaInsets();
    const FOOTER_HEIGHT = 50; // Height of the custom tab bar
    const containerHeight =
        SCREEN_HEIGHT - FOOTER_HEIGHT - (insets.bottom || 0);
    const translateY = useSharedValue(SCREEN_HEIGHT + 10);
    const isHiding = useSharedValue(false);
    const [keepMounted, setKeepMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<PlayerTab>(null);
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
    }, [isPlayerVisible, translateY, isHiding, onHideComplete]);

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
    }, [translateY, isHiding, onHideComplete]);

    // Pan-down to dismiss — disabled when a tab panel is open so it doesn't
    // interfere with the panel's own scrolling
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            // Disable pan when a tab panel is open (activeTab != null)
            if (activeTab) return;
            if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
            // Disable pan when a tab panel is open (activeTab != null)
            if (activeTab) return;
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
                source={
                    currentMedia?.imageUrl
                        ? { uri: currentMedia.imageUrl }
                        : null
                }
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={30}
            />
            <View style={styles.overlay} />

            {/* Main content wrapped in pan gesture detector */}
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[styles.inner, { paddingTop: insets.top + 4 }]}
                >
                    <PlayerTopBar
                        title={currentMedia?.name ?? ""}
                        onClose={handleHide}
                        onSettings={() =>
                            setActiveTab((prev) =>
                                prev === "crossfade" ? null : "crossfade"
                            )
                        }
                    />
                    <PlayerSongInfo
                        currentMedia={currentMedia}
                        onSeek={seekTo}
                        videoPlayer={videoPlayer ?? null}
                        hasVideo={!!hasVideo}
                    />
                    <PlayerTabsBar
                        activeTab={activeTab}
                        onTabPress={handleTabPress}
                        insetBottom={Math.max(insets.bottom, 8)}
                    />
                </Animated.View>
            </GestureDetector>

            <PlayerBottomSheet
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                insetBottom={Math.max(insets.bottom, 8)}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        // Height will be set dynamically to avoid covering the footer
        zIndex: 20,
        backgroundColor: "#0b0b0b",
        overflow: "hidden",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    inner: {
        flex: 1,
    },
});
