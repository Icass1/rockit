import React from "react";
import { useStore } from "@nanostores/react";
import { TMedia } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Maximize, Video, VideoOff } from "@rockit/ui/icons";
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
import PlayerControls from "@/components/Player/PlayerControls";
import PlayerCover from "@/components/Player/PlayerCover";
import PlayerProgress from "@/components/Player/PlayerProgress";
import VideoSurface from "@/components/Player/VideoSurface";

interface PlayerMediaInfoProps {
    currentMedia: TMedia | undefined; // TMedia from PlayerContext
    onSeek: (seconds: number) => void;
    hasVideo: boolean;
    canToggleAudioOnly: boolean;
    audioOnly: boolean;
    onToggleAudioOnly: () => void;
    isMediaFullscreen: boolean;
    onMediaFullscreen: () => void;
}

export default function PlayerMediaInfo({
    currentMedia,
    onSeek,
    hasVideo,
    canToggleAudioOnly,
    audioOnly,
    onToggleAudioOnly,
    isMediaFullscreen,
    onMediaFullscreen,
}: PlayerMediaInfoProps) {
    const theme = useDesignTheme();
    const { width } = useWindowDimensions();
    const COVER_SIZE = Math.min(
        width - theme.spacing.xl * 2,
        theme.layout.playerArtworkMax
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
                        <PlayerCover
                            uri={currentMedia?.imageUrl}
                            mediaType={currentMedia?.type}
                            size={COVER_SIZE}
                        />
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

            {/* Title / artist / like button */}
            <View style={styles.infoRow}>
                <View style={styles.infoText}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentMedia?.name ?? ""}
                    </Text>
                    {currentMedia && (
                        <MediaSubTitle
                            media={currentMedia}
                            style={styles.subTitle}
                            numberOfLines={1}
                        />
                    )}
                    <Text style={styles.subSubTitle} numberOfLines={1}>
                        {currentMedia && (
                            <MediaSubSubTitle media={currentMedia} />
                        )}
                    </Text>
                </View>

                {/* Like button – hand + flame animation */}
                {currentMedia?.publicId && (
                    <MobileLikeButton mediaPublicId={currentMedia.publicId} />
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
