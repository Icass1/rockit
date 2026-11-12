import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LyricsCorrectionContextResponse } from "@/dto";
import {
    getMediaArtists,
    lyricPlaybackTime,
    lyricSeekTime,
} from "@/shared/index";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
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
    const lineLayouts = useRef(
        new Map<number, { y: number; height: number }>()
    );
    const [viewportHeight, setViewportHeight] = useState(0);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (!publicId) return;
        lineLayouts.current.clear();
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

    const centerActiveLine = useCallback(
        (animated = true) => {
            if (currentIndex === null || !viewportHeight) return;
            const line = lineLayouts.current.get(currentIndex);
            if (!line) return;
            scrollRef.current?.scrollTo({
                // Lines are measured inside the unpadded wrapper. The content's
                // half-viewport leading space cancels the centering subtraction.
                y: Math.max(0, line.y + line.height / 2),
                animated: animated && !reducedMotion,
            });
        },
        [currentIndex, reducedMotion, viewportHeight]
    );
    useEffect(() => centerActiveLine(), [centerActiveLine, lyrics]);

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
                    testID="lyrics-scroll"
                    style={styles.scroll}
                    onLayout={({ nativeEvent }) =>
                        setViewportHeight(nativeEvent.layout.height)
                    }
                    onContentSizeChange={() => centerActiveLine(false)}
                    contentContainerStyle={[
                        styles.content,
                        { paddingVertical: viewportHeight / 2 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View>
                        {lyrics.lines.map((line, index) => (
                            <Text
                                key={index}
                                testID={
                                    currentIndex === index
                                        ? "active-lyric"
                                        : undefined
                                }
                                onLayout={({ nativeEvent }) => {
                                    lineLayouts.current.set(
                                        index,
                                        nativeEvent.layout
                                    );
                                    if (index === currentIndex)
                                        centerActiveLine(false);
                                }}
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
                            <Text style={styles.footerId}>
                                {lyrics.publicId}
                            </Text>
                        </View>
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
        },
        scroll: {
            flex: 1,
            minHeight: 0,
        },
        lyricLine: {
            fontSize: theme.typography.title,
            fontWeight: "600",
            color: withAlpha(theme.colors["foreground-strong"], 0.35),
            lineHeight: theme.typography.heading + theme.spacing.xs,
            marginBottom: theme.spacing.sm,
            paddingRight: theme.spacing.lg,
        },
        lyricLineActive: {
            color: theme.legacy.white,
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
