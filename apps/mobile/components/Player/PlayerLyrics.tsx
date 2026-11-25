import { useEffect, useMemo, useState } from "react";
import { type LyricsCorrectionContextResponse } from "@/dto";
import { getMediaArtists, lyricPlaybackTime } from "@/shared/index";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Http } from "@/lib/http";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";
import LyricsMissing from "@/components/Player/LyricsMissing";
import PlayerLyricsScroll from "@/components/Player/PlayerLyricsScroll";

export default function PlayerLyrics() {
    const styles = useThemedStyles(createStyles);
    const { width, height, fontScale } = useWindowDimensions();
    const { currentMedia, seekTo } = usePlayer();
    const { currentTime } = usePlayerTime();
    const { vocabulary } = useVocabulary();

    const [fetchedLyrics, setLyrics] =
        useState<LyricsCorrectionContextResponse>();
    const [reload, setReload] = useState(0);
    const [loadedPublicId, setLoadedPublicId] = useState<string>();
    const publicId = currentMedia?.publicId;
    const loading = !!publicId && loadedPublicId !== publicId;
    const lyrics =
        publicId && loadedPublicId === publicId ? fetchedLyrics : undefined;
    useEffect(() => {
        if (!publicId) return;
        let cancelled = false;

        void Http.getLyricsCorrectionContextAsync(publicId)
            .then((response) => {
                if (cancelled) return;
                setLyrics(response.isOk() ? response.result : undefined);
                setLoadedPublicId(publicId);
            })
            .catch(() => {
                if (!cancelled) {
                    setLyrics(undefined);
                    setLoadedPublicId(publicId);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [publicId, reload]);

    useEffect(() => {
        if (lyrics?.syncStatus !== "pending") return;
        const timer = setInterval(() => setReload((value) => value + 1), 30000);
        return () => clearInterval(timer);
    }, [lyrics?.syncStatus]);

    const currentIndex = useMemo(() => {
        if (
            loading ||
            !lyrics ||
            currentTime === null ||
            currentTime === undefined
        )
            return null;

        const offset = lyrics.offset;

        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            const timestamp = lyrics.lines[i].timestamp_s;
            if (
                timestamp !== null &&
                currentTime >= lyricPlaybackTime(timestamp, offset)
            ) {
                return i;
            }
        }

        return null;
    }, [lyrics, currentTime, loading]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{vocabulary.LYRICS}</Text>
                {lyrics?.syncStatus === "pending" && (
                    <Text style={styles.headerSubtitle}>
                        {vocabulary.LYRICS_SOURCE_PENDING}
                    </Text>
                )}
                {currentMedia && (
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {currentMedia.name}
                        {" · "}
                        {getMediaArtists(currentMedia)
                            .map((a) => a.name)
                            .join(", ")}
                    </Text>
                )}
            </View>

            {loading && (
                <View style={styles.centerContent}>
                    <Text style={styles.stateText}>
                        {vocabulary.LYRICS_LOADING}
                    </Text>
                </View>
            )}

            {!loading &&
                (!lyrics || lyrics.lines.length === 0) &&
                (currentMedia?.type === "song" ? (
                    <LyricsMissing
                        key={currentMedia.publicId}
                        mediaPublicId={currentMedia.publicId}
                        onSubmitted={() => setReload((value) => value + 1)}
                    />
                ) : (
                    <View style={styles.centerContent}>
                        <Text style={styles.stateText}>
                            {vocabulary.LYRICS_UNAVAILABLE}
                        </Text>
                    </View>
                ))}

            {!loading && lyrics && lyrics.lines.length > 0 && (
                <PlayerLyricsScroll
                    key={`${publicId}:${Math.round(width)}:${Math.round(height)}:${fontScale}`}
                    lyrics={lyrics}
                    currentIndex={currentIndex}
                    currentTime={currentTime ?? 0}
                    seekTo={seekTo}
                />
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            paddingHorizontal: 20,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: withAlpha(
                theme.colors["foreground-strong"],
                0.1
            ),
        },
        headerTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
        },
        headerSubtitle: {
            fontSize: 13,
            color: theme.legacy.gray400,
            marginTop: 2,
        },
        centerContent: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        },
        stateText: {
            fontSize: theme.typography.label,
            color: theme.legacy.gray400,
            textAlign: "center",
        },
    });
