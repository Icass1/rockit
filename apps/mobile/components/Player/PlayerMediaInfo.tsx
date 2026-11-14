import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { isSong, type TQueueMedia } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import {
    ExplicitBadge,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Disc3, DiscAlbum, Maximize, Video, VideoOff } from "@rockit/ui/icons";
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { rockIt } from "@/lib/rockit/rockIt";
import MediaSubSubTitle from "@/components/MediaSubSubTitle";
import MediaSubTitle from "@/components/MediaSubTitle";
import MobileLikeButton from "@/components/Player/MobileLikeButton";
import PlayerArtwork from "@/components/Player/PlayerArtwork";
import PlayerControls from "@/components/Player/PlayerControls";
import PlayerProgress from "@/components/Player/PlayerProgress";
import VideoSurface from "@/components/Player/VideoSurface";

interface PlayerMediaInfoProps {
    availableHeight: number;
    currentMedia: TQueueMedia | undefined;
    isPlaying: boolean;
    artworkVisible: boolean;
    onSeek: (seconds: number) => void;
    hasVideo: boolean;
    canToggleAudioOnly: boolean;
    audioOnly: boolean;
    onToggleAudioOnly: () => void;
    isMediaFullscreen: boolean;
    onMediaFullscreen: () => void;
}

export default function PlayerMediaInfo({
    availableHeight,
    currentMedia,
    isPlaying,
    artworkVisible,
    onSeek,
    hasVideo,
    canToggleAudioOnly,
    audioOnly,
    onToggleAudioOnly,
    isMediaFullscreen,
    onMediaFullscreen,
}: PlayerMediaInfoProps) {
    const vinylMode = useStore(rockIt.playerUIManager.vinylModeAtom);
    const theme = useDesignTheme();
    const [detailsHeight, setDetailsHeight] = useState(0);
    const { width, height } = useWindowDimensions();
    const COVER_SIZE = Math.min(
        width - theme.spacing.xl * 2,
        theme.layout.playerArtworkMax,
        Math.max(theme.layout.artistArtwork, availableHeight - detailsHeight),
        width > height ? height * 0.4 : theme.layout.playerArtworkMax
    );
    const styles = useThemedStyles(createStyles);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <View style={styles.container}>
            {/* Album artwork / video */}
            <View style={[styles.coverContainer, { height: COVER_SIZE }]}>
                <View style={{ width: COVER_SIZE }}>
                    {hasVideo && !isMediaFullscreen ? (
                        <View
                            style={[
                                styles.videoContainer,
                                { width: COVER_SIZE },
                            ]}
                        >
                            <VideoSurface
                                style={styles.videoView}
                                contentFit="contain"
                                nativeControls={false}
                            />
                        </View>
                    ) : (
                        <PlayerArtwork
                            media={currentMedia}
                            size={COVER_SIZE}
                            playing={isPlaying}
                            visible={artworkVisible}
                        />
                    )}
                    {currentMedia &&
                        isSong(currentMedia) &&
                        !isMediaFullscreen && (
                            <Pressable
                                testID="player-artwork-toggle"
                                onPress={() =>
                                    rockIt.playerUIManager.toggleVinylMode()
                                }
                                style={styles.artworkModeButton}
                                accessibilityRole="button"
                                accessibilityLabel={
                                    vinylMode
                                        ? vocabulary.PLAYER_ARTWORK_COVER
                                        : vocabulary.PLAYER_ARTWORK_VINYL
                                }
                                hitSlop={8}
                            >
                                {vinylMode ? (
                                    <DiscAlbum
                                        size={24}
                                        color={theme.colors["on-media"]}
                                    />
                                ) : (
                                    <Disc3
                                        size={24}
                                        color={theme.colors["on-media"]}
                                    />
                                )}
                            </Pressable>
                        )}
                    {currentMedia && !isMediaFullscreen && (
                        <Pressable
                            onPress={onMediaFullscreen}
                            style={styles.fullscreenButton}
                            accessibilityRole="button"
                            accessibilityLabel={
                                vocabulary.PLAYER_ENTER_FULLSCREEN
                            }
                            hitSlop={8}
                        >
                            <Maximize size={22} color={theme.legacy.white} />
                        </Pressable>
                    )}
                </View>

                {canToggleAudioOnly && (
                    <Pressable
                        onPress={onToggleAudioOnly}
                        style={styles.audioOnlyButton}
                        hitSlop={8}
                        accessibilityLabel={
                            audioOnly
                                ? vocabulary.PLAYER_SHOW_VIDEO
                                : vocabulary.PLAYER_AUDIO_ONLY
                        }
                    >
                        {audioOnly ? (
                            <VideoOff size={20} color={theme.legacy.white} />
                        ) : (
                            <Video size={20} color={theme.legacy.white} />
                        )}
                    </Pressable>
                )}
            </View>

            <View
                onLayout={({ nativeEvent }) =>
                    setDetailsHeight(nativeEvent.layout.height)
                }
            >
                {/* Title / artist / like button */}
                <View style={styles.infoRow}>
                    <View style={styles.infoText}>
                        <Text style={styles.title} numberOfLines={1}>
                            {currentMedia?.name ?? ""}
                        </Text>
                        {currentMedia && (
                            <>
                                <ExplicitBadge
                                    explicit={
                                        currentMedia?.type === "song"
                                            ? currentMedia.explicit
                                            : null
                                    }
                                    label={vocabulary.CONTENT_RATING_EXPLICIT}
                                />
                                <MediaSubTitle
                                    media={currentMedia}
                                    style={styles.subTitle}
                                    numberOfLines={1}
                                />
                            </>
                        )}
                        <Text style={styles.subSubTitle} numberOfLines={1}>
                            {currentMedia && (
                                <MediaSubSubTitle media={currentMedia} />
                            )}
                        </Text>
                    </View>

                    {/* Like button – hand + flame animation */}
                    {currentMedia?.publicId && (
                        <MobileLikeButton
                            mediaPublicId={currentMedia.publicId}
                        />
                    )}
                </View>

                {/* Progress slider */}
                <View style={styles.progressContainer}>
                    <PlayerProgress onSeek={onSeek} />
                </View>

                {/* Playback controls */}
                <View style={styles.controlsContainer}>
                    <PlayerControls />
                </View>
            </View>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.lg,
            justifyContent: "center",
        },
        coverContainer: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: theme.spacing.xs,
        },
        videoContainer: {
            aspectRatio: 16 / 9,
            borderRadius: theme.radius.lg,
            overflow: "hidden",
            backgroundColor: theme.colors["backdrop"],
        },
        videoView: {
            flex: 1,
        },
        artworkModeButton: {
            position: "absolute",
            top: 8,
            left: 8,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(theme.colors.backdrop, 0.6),
        },
        fullscreenButton: {
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.6),
        },
        audioOnlyButton: {
            position: "absolute",
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.5),
        },
        infoRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: theme.spacing.md,
            paddingHorizontal: theme.spacing.xs,
            gap: theme.spacing.sm,
        },
        infoText: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            fontSize: 22,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        subTitle: {
            fontSize: 15,
            color: withAlpha(theme.colors["foreground-strong"], 0.7),
            fontWeight: "500",
            marginTop: theme.spacing.xs,
        },
        subSubTitle: {
            fontSize: 13,
            color: withAlpha(theme.colors["foreground-strong"], 0.45),
            marginTop: 2,
        },
        likeButton: {
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        },
        progressContainer: {
            paddingTop: 10,
        },
        controlsContainer: {
            paddingTop: theme.spacing.md,
        },
    });
