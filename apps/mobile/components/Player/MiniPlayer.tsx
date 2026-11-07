import { useEffect, useState } from "react";
import { getMediaArtistsString } from "@rockit/shared";
import { designTokens, withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Pause, Play, SkipForward } from "@rockit/ui/icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useContextMenu } from "@/lib/ContextMenuContext";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import { useVocabulary } from "@/lib/vocabulary";

export const MINI_PLAYER_HEIGHT = designTokens.layout.miniPlayerHeight;

export default function MiniPlayer() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const {
        currentMedia,
        isPlaying,
        isLoading,
        togglePlayPause,
        skipForward,
        showPlayer,
    } = usePlayer();
    const { currentTime, duration } = usePlayerTime();

    const [scale] = useState(() => new Animated.Value(1));
    const { isPlayerVisible } = usePlayer();
    const { isOpen: isContextMenuOpen } = useContextMenu();
    const shouldHide = isPlayerVisible || isContextMenuOpen;
    const [opacity] = useState(() => new Animated.Value(shouldHide ? 0 : 1));
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        logSheetDebug("miniPlayer.visibility", {
            isPlayerVisible,
            isContextMenuOpen,
            shouldHide,
        });
    }, [isPlayerVisible, isContextMenuOpen, shouldHide]);

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: shouldHide ? 0 : 1,
            duration: 120,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && shouldHide) setIsHidden(true);
        });
        return () => opacity.stopAnimation();
    }, [shouldHide, opacity]);

    if (!shouldHide && isHidden) {
        setIsHidden(false);
    }

    const handlePressIn = () =>
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 50,
        }).start();

    const handlePressOut = () =>
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
        }).start();

    if (!currentMedia) return null;
    if (shouldHide && isHidden) return null;

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Animated.View
            style={[styles.wrapper, { transform: [{ scale }], opacity }]}
        >
            <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />

            {/* Active accent strip on the left edge */}
            <View style={[styles.accent, isPlaying && styles.accentActive]} />

            <Pressable
                style={styles.content}
                accessibilityRole="button"
                accessibilityLabel={currentMedia.name}
                onPress={showPlayer}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <View style={styles.thumbnailContainer}>
                    <Image
                        source={{ uri: currentMedia.imageUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={200}
                    />
                </View>

                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentMedia.name}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {getMediaArtistsString(currentMedia)}
                    </Text>
                </View>

                {/* Play / Pause */}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                        isPlaying ? vocabulary.PAUSE : vocabulary.PLAY
                    }
                    style={styles.controlButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    hitSlop={12}
                >
                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={theme.legacy.white}
                        />
                    ) : isPlaying ? (
                        <Pause size={22} color={theme.legacy.white} />
                    ) : (
                        <Play size={22} color={theme.legacy.white} />
                    )}
                </Pressable>

                {/* Skip forward */}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={vocabulary.NEXT_MEDIA}
                    style={styles.controlButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        skipForward();
                    }}
                    hitSlop={12}
                >
                    <SkipForward size={22} color={theme.legacy.white} />
                </Pressable>
            </Pressable>

            {/* Progress track hint at the very bottom */}
            <View style={styles.progressTrack}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progressPercent}%` },
                    ]}
                >
                    <LinearGradient
                        colors={[
                            theme.legacy.accent,
                            theme.legacy.accentMid,
                            theme.legacy.accentLight,
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        wrapper: {
            height: MINI_PLAYER_HEIGHT,
            width: "100%",
            overflow: "hidden",
            position: "relative",
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.7),
        },
        blurFallback: {
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.7),
        },
        accent: {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: "transparent",
        },
        accentActive: {
            backgroundColor: theme.legacy.accent,
        },
        content: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 0,
            paddingRight: theme.spacing.md,
            gap: theme.spacing.md,
        },
        thumbnailContainer: {
            position: "relative",
            width: MINI_PLAYER_HEIGHT,
            aspectRatio: 1,
            padding: theme.spacing.xs,
        },
        thumbnail: {
            flex: 1,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.legacy.bgCard,
        },
        videoBadge: {
            position: "absolute",
            bottom: 2,
            right: 2,
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.7),
            borderRadius: theme.radius.sm,
            padding: 2,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            fontSize: theme.typography.label,
            fontWeight: "600",
            color: theme.legacy.white,
            marginBottom: 2,
        },
        artist: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray400,
        },
        controlButton: {
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
        },
        progressTrack: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: withAlpha(theme.colors["foreground-strong"], 0.1),
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
        },
    });
