import { useEffect, useMemo, useRef, useState } from "react";
import { type LyricsCorrectionContextResponse } from "@/dto";
import {
    getMediaArtists,
    lyricPlaybackTime,
    lyricSeekTime,
} from "@/shared/index";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";

export default function PlayerLyrics() {
    const styles = useThemedStyles(createStyles);
    const { currentMedia, seekTo } = usePlayer();
    const { currentTime } = usePlayerTime();
    const { vocabulary } = useVocabulary();

    const [fetchedLyrics, setLyrics] =
        useState<LyricsCorrectionContextResponse>();
    const [loadedPublicId, setLoadedPublicId] = useState<string>();
    const publicId = currentMedia?.publicId;
    const loading = !!publicId && loadedPublicId !== publicId;
    const lyrics =
        publicId && loadedPublicId === publicId ? fetchedLyrics : undefined;
    const scrollRef = useRef<ScrollView>(null);

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
    }, [publicId]);

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

    useEffect(() => {
        if (!scrollRef.current || currentIndex === null || !lyrics) return;

        const LINE_HEIGHT = 44;
        const targetY = currentIndex * LINE_HEIGHT;
        scrollRef.current.scrollTo({
            y: Math.max(0, targetY - 150),
            animated: true,
        });
    }, [currentIndex, lyrics]);

    const goToLine = (index: number): void => {
        const timestamp = lyrics?.lines[index].timestamp_s;
        if (timestamp !== undefined && timestamp !== null) {
            seekTo(lyricSeekTime(timestamp, lyrics?.offset));
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{vocabulary.LYRICS}</Text>
                {currentMedia && (
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {currentMedia.name}
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

            {!loading && (!lyrics || lyrics.lines.length === 0) && (
                <View style={styles.centerContent}>
                    <Text style={styles.stateText}>
                        {vocabulary.LYRICS_UNAVAILABLE}
                    </Text>
                </View>
            )}

            {!loading && lyrics && lyrics.lines.length > 0 && (
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {lyrics.lines.map((line, index) => (
                        <Text
                            key={index}
                            onPress={() => goToLine(index)}
                            style={[
                                styles.lyricLine,
                                currentIndex === index &&
                                    styles.lyricLineActive,
                                currentIndex !== null &&
                                    index < currentIndex &&
                                    styles.lyricLinePast,
                            ]}
                        >
                            {line.text}
                        </Text>
                    ))}

                    <View style={styles.footer}>
                        <Text style={styles.footerLabel}>
                            {vocabulary.LYRICS_BY}
                        </Text>
                        <Text style={styles.footerProvider}>
                            {lyrics.provider}
                        </Text>
                        <Text style={styles.footerId}>{lyrics.publicId}</Text>
                    </View>
                </ScrollView>
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
        content: {
            paddingHorizontal: theme.spacing.xl,
            paddingTop: 20,
            paddingBottom: 120,
        },
        lyricLine: {
            fontSize: 22,
            fontWeight: "600",
            color: withAlpha(theme.colors["foreground-strong"], 0.35),
            lineHeight: 36,
            marginBottom: theme.spacing.sm,
            paddingRight: theme.spacing.lg,
        },
        lyricLineActive: {
            color: theme.legacy.white,
            fontSize: 26,
            fontWeight: "700",
        },
        lyricLinePast: {
            color: withAlpha(theme.colors["foreground-strong"], 0.2),
        },
        footer: {
            alignItems: "center",
            marginTop: 96,
            gap: theme.spacing.md,
        },
        footerLabel: {
            fontSize: theme.typography.label,
            fontWeight: "600",
            color: theme.legacy.gray400,
        },
        footerProvider: {
            fontSize: theme.typography.body,
            fontWeight: "600",
            color: theme.legacy.gray400,
        },
        footerId: {
            fontSize: 11,
            color: theme.legacy.gray600,
        },
    });
