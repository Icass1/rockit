import { useCallback, useEffect, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { VideoView } from "expo-video";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
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
import CrossfadeSettings from "./CrossfadeSettings";
import PlayerControls from "./PlayerControls";
import PlayerCover from "./PlayerCover";
import PlayerLyrics from "./PlayerLyrics";
import PlayerProgress from "./PlayerProgress";
import PlayerQueue from "./PlayerQueue";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const SPRING_CONFIG = {
    damping: 50,
    stiffness: 300,
    mass: 0.8,
};

export default function FullPlayer() {
    const {
        currentMedia,
        isPlayerVisible,
        currentTime,
        duration,
        seekTo,
        hidePlayer,
        videoPlayer,
        videoOpacity,
        activeMediaType,
    } = usePlayer();

    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const queueSheetRef = useRef<any>(null);
    const lyricsSheetRef = useRef<any>(null);
    const crossfadeSheetRef = useRef<any>(null);
    const subPanelOpen = useRef(false);

    useEffect(() => {
        if (isPlayerVisible) {
            translateY.value = withSpring(0, SPRING_CONFIG);
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        }
    }, [isPlayerVisible, translateY]);

    const handleHide = useCallback(() => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 280 });
        hidePlayer();
    }, [hidePlayer, translateY]);

    const panGesture = Gesture.Pan()
        .onStart(() => {})
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            const shouldDismiss =
                event.translationY > SCREEN_HEIGHT / 3 || event.velocityY > 800;

            if (shouldDismiss) {
                translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
                runOnJS(handleHide)();
            } else {
                translateY.value = withSpring(0, SPRING_CONFIG);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const openQueue = useCallback(() => {
        subPanelOpen.current = true;
        queueSheetRef.current?.expand();
    }, []);

    const openLyrics = useCallback(() => {
        subPanelOpen.current = true;
        lyricsSheetRef.current?.expand();
    }, []);

    const openCrossfade = useCallback(() => {
        subPanelOpen.current = true;
        crossfadeSheetRef.current?.expand();
    }, []);

    if (!currentMedia && !isPlayerVisible) return null;

    const coverUri = currentMedia?.imageUrl ?? null;
    const mediaType = currentMedia?.type ?? "song";

    return (
        <>
            <Animated.View style={[styles.container, animatedStyle]}>
                <Image
                    source={coverUri ? { uri: coverUri } : null}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    blurRadius={30}
                />
                <View style={styles.overlay} />

                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[styles.inner, { paddingTop: insets.top + 8 }]}
                    >
                        <View style={styles.topBar}>
                            <Pressable onPress={handleHide} hitSlop={12}>
                                <Feather
                                    name="chevron-down"
                                    size={28}
                                    color={COLORS.white}
                                />
                            </Pressable>
                            <Text style={styles.topBarTitle} numberOfLines={1}>
                                {currentMedia?.name ?? ""}
                            </Text>
                            <Pressable hitSlop={12}>
                                <Feather
                                    name="more-horizontal"
                                    size={24}
                                    color={COLORS.white}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.coverContainer}>
                            {activeMediaType === "video" && videoPlayer ? (
                                <Animated.View
                                    style={[
                                        styles.videoContainer,
                                        { opacity: videoOpacity },
                                    ]}
                                >
                                    <VideoView
                                        player={videoPlayer}
                                        style={styles.videoView}
                                        contentFit="contain"
                                        nativeControls={false}
                                    />
                                </Animated.View>
                            ) : (
                                <PlayerCover
                                    uri={coverUri}
                                    mediaType={mediaType}
                                    size={Math.min(SCREEN_WIDTH - 48, 320)}
                                />
                            )}
                        </View>

                        <View style={styles.songInfo}>
                            <View style={styles.songInfoText}>
                                <Text
                                    style={styles.songTitle}
                                    numberOfLines={1}
                                >
                                    {currentMedia?.name ?? ""}
                                </Text>
                                <Text
                                    style={styles.songArtist}
                                    numberOfLines={1}
                                >
                                    {currentMedia?.artists[0]?.name ?? ""}
                                </Text>
                                {mediaType === "song" &&
                                    currentMedia &&
                                    "album" in currentMedia && (
                                        <Text
                                            style={styles.songAlbum}
                                            numberOfLines={1}
                                        >
                                            {"album" in currentMedia
                                                ? (
                                                      currentMedia as unknown as {
                                                          album?: {
                                                              name?: string;
                                                          };
                                                      }
                                                  ).album?.name
                                                : ""}
                                        </Text>
                                    )}
                            </View>
                        </View>

                        <View style={styles.progressContainer}>
                            <PlayerProgress
                                currentTime={currentTime}
                                duration={duration}
                                onSeek={seekTo}
                            />
                        </View>

                        <View style={styles.controlsContainer}>
                            <PlayerControls />
                        </View>

                        <View
                            style={[
                                styles.bottomActions,
                                {
                                    paddingBottom: Math.max(
                                        insets.bottom + 8,
                                        24
                                    ),
                                },
                            ]}
                        >
                            <Pressable
                                style={styles.actionButton}
                                onPress={openQueue}
                            >
                                <Feather
                                    name="list"
                                    size={20}
                                    color="rgba(255,255,255,0.7)"
                                />
                                <Text style={styles.actionLabel}>Queue</Text>
                            </Pressable>
                            <Pressable
                                style={styles.actionButton}
                                onPress={openLyrics}
                            >
                                <Feather
                                    name="file-text"
                                    size={20}
                                    color="rgba(255,255,255,0.7)"
                                />
                                <Text style={styles.actionLabel}>Lyrics</Text>
                            </Pressable>
                            <Pressable
                                style={styles.actionButton}
                                onPress={openCrossfade}
                            >
                                <Feather
                                    name="sliders"
                                    size={20}
                                    color="rgba(255,255,255,0.7)"
                                />
                                <Text style={styles.actionLabel}>
                                    Crossfade
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </Animated.View>

            <PlayerQueue sheetRef={queueSheetRef} />
            <PlayerLyrics sheetRef={lyricsSheetRef} />
            <BottomSheet
                ref={crossfadeSheetRef}
                index={-1}
                snapPoints={["35%"]}
                enablePanDownToClose
                backgroundStyle={{
                    backgroundColor: "#1c1c1e",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
                handleIndicatorStyle={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    width: 36,
                }}
                containerStyle={{ zIndex: 200, elevation: 200 }}
            >
                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#fff",
                            marginBottom: 12,
                        }}
                    >
                        Crossfade
                    </Text>
                    <CrossfadeSettings />
                </View>
            </BottomSheet>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT,
        zIndex: 100,
        backgroundColor: "#0b0b0b",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    inner: {
        flex: 1,
        justifyContent: "space-between",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    topBarTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 15,
        fontWeight: "600",
        color: "rgba(255,255,255,0.85)",
        marginHorizontal: 12,
    },
    coverContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        maxHeight: 450,
        minHeight: 180,
    },
    songInfo: {
        paddingHorizontal: 28,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    songInfoText: { flex: 1, minWidth: 0 },
    songTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.white,
        marginBottom: 4,
    },
    songArtist: {
        fontSize: 16,
        color: "rgba(255,255,255,0.75)",
        fontWeight: "500",
    },
    songAlbum: {
        fontSize: 13,
        color: "rgba(255,255,255,0.45)",
        marginTop: 2,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    controlsContainer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    bottomActions: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
    },
    actionLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.55)",
        fontWeight: "500",
    },
    videoContainer: {
        width: Math.min(SCREEN_WIDTH - 48, 320),
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
    },
    videoView: {
        flex: 1,
    },
});
