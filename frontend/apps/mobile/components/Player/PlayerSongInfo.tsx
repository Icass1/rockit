import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import type { VideoPlayer } from "expo-video";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import PlayerControls from "./PlayerControls";
import PlayerCover from "./PlayerCover";
import PlayerProgress from "./PlayerProgress";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Cover size mirrors the old MobilePlayerUI — fills most of the screen width
const COVER_SIZE = Math.min(SCREEN_WIDTH - 48, 340);

interface PlayerSongInfoProps {
    currentMedia: any; // TMedia from PlayerContext
    onSeek: (seconds: number) => void;
    videoPlayer: VideoPlayer | null;
    hasVideo: boolean;
}

export default function PlayerSongInfo({
    currentMedia,
    onSeek,
    videoPlayer,
    hasVideo,
}: PlayerSongInfoProps) {
    const [liked, setLiked] = useState(false);

    return (
        <View style={styles.container}>
            {/* ── Album artwork / video ── */}
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
            </View>

            {/* ── Title / artist / like button ── */}
            <View style={styles.infoRow}>
                <View style={styles.infoText}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentMedia?.name ?? ""}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                        {currentMedia?.artists
                            ?.map((a: { name: string }) => a.name)
                            .join(", ") ?? ""}
                    </Text>
                    {currentMedia?.type === "song" &&
                        currentMedia?.album?.name && (
                            <Text style={styles.album} numberOfLines={1}>
                                {currentMedia.album.name}
                            </Text>
                        )}
                </View>

                {/* Like / heart button — wired to a local toggle; connect to
                    your favourite API endpoint as needed */}
                <Pressable
                    style={styles.likeButton}
                    hitSlop={12}
                    onPress={() => setLiked((v) => !v)}
                >
                    <Feather
                        name="heart"
                        size={26}
                        color={liked ? COLORS.accent : COLORS.white}
                        style={liked ? { opacity: 1 } : { opacity: 0.85 }}
                    />
                </Pressable>
            </View>

            {/* ── Progress slider ── */}
            <View style={styles.progressContainer}>
                <PlayerProgress onSeek={onSeek} />
            </View>

            {/* ── Playback controls ── */}
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
    artist: {
        fontSize: 15,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
        marginTop: 4,
    },
    album: {
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
        paddingTop: 4,
    },
});
