import React from "react";
import { COLORS } from "@/constants/theme";
import { TMedia } from "@rockit/shared";
import type { VideoPlayer } from "expo-video";
import { VideoView } from "expo-video";
import { Video, VideoOff } from "lucide-react-native";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import MediaSubSubTitle from "@/components/MediaSubSubTitle";
import MediaSubTitle from "@/components/MediaSubTitle";
import MobileLikeButton from "@/components/Player/MobileLikeButton";
import PlayerControls from "@/components/Player/PlayerControls";
import PlayerCover from "@/components/Player/PlayerCover";
import PlayerProgress from "@/components/Player/PlayerProgress";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Cover size mirrors the old MobilePlayerUI — fills most of the screen width
const COVER_SIZE = Math.min(SCREEN_WIDTH - 48, 340);

interface PlayerMediaInfoProps {
    currentMedia: TMedia | undefined; // TMedia from PlayerContext
    onSeek: (seconds: number) => void;
    videoPlayer: VideoPlayer | null;
    hasVideo: boolean;
    canToggleAudioOnly: boolean;
    audioOnly: boolean;
    onToggleAudioOnly: () => void;
}

export default function PlayerMediaInfo({
    currentMedia,
    onSeek,
    videoPlayer,
    hasVideo,
    canToggleAudioOnly,
    audioOnly,
    onToggleAudioOnly,
}: PlayerMediaInfoProps) {
    return (
        <View style={styles.container}>
            {/* Album artwork / video */}
            <View style={[styles.coverContainer, { height: COVER_SIZE }]}>
                {hasVideo && videoPlayer ? (
                    <View
                        style={[styles.videoContainer, { width: COVER_SIZE }]}
                    >
                        <VideoView
                            player={videoPlayer}
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

                {canToggleAudioOnly && (
                    <Pressable
                        onPress={onToggleAudioOnly}
                        style={styles.audioOnlyButton}
                        hitSlop={8}
                        accessibilityLabel={
                            audioOnly ? "Show video" : "Audio only"
                        }
                    >
                        {audioOnly ? (
                            <VideoOff size={20} color={COLORS.white} />
                        ) : (
                            <Video size={20} color={COLORS.white} />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        justifyContent: "center",
    },
    coverContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
    },
    videoContainer: {
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
    },
    videoView: {
        flex: 1,
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
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 12,
        paddingHorizontal: 4,
        gap: 8,
    },
    infoText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.white,
    },
    subTitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
        marginTop: 4,
    },
    subSubTitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.45)",
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
        paddingTop: 12,
    },
});
