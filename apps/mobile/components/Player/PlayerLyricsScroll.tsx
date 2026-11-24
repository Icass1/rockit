import { useCallback, useEffect, useRef, useState } from "react";
import type { LyricsCorrectionContextResponse } from "@/dto";
import { lyricSeekTime, lyricWordState } from "@/shared/index";
import { designTokens, withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useVocabulary } from "@/lib/vocabulary";
import LyricLine from "@/components/Player/LyricLine";

/** Measured positions belong to one viewport; a resize never reuses old scroll coordinates. */
export default function PlayerLyricsScroll({
    lyrics,
    currentIndex,
    currentTime,
    seekTo,
}: {
    lyrics: LyricsCorrectionContextResponse;
    currentIndex: number | null;
    currentTime: number;
    seekTo: (seconds: number) => Promise<void>;
}) {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const scrollRef = useRef<ScrollView>(null);
    const scrollOffset = useRef(0);
    const scrollFrame = useRef<number | undefined>(undefined);
    const cancelScroll = useCallback(() => {
        if (scrollFrame.current !== undefined)
            cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = undefined;
    }, []);
    useEffect(() => cancelScroll, [cancelScroll]);
    const lineLayouts = useRef(
        new Map<number, { y: number; height: number }>()
    );
    const [viewportHeight, setViewportHeight] = useState(0);
    const reducedMotion = useReducedMotion();

    const centerActiveLine = useCallback(
        (animated = true) => {
            if (currentIndex === null || !viewportHeight) return;
            const line = lineLayouts.current.get(currentIndex);
            if (!line) return;
            cancelScroll();
            // Preserve measured centering, with one bounded duration on all targets.
            const target = Math.max(0, line.y + line.height / 2);
            if (!animated || reducedMotion) {
                scrollOffset.current = target;
                scrollRef.current?.scrollTo({ y: target, animated: false });
                return;
            }
            const from = scrollOffset.current;
            const started = Date.now();
            const tick = () => {
                const progress = Math.min(
                    1,
                    (Date.now() - started) / designTokens.motion.lyricsScroll
                );
                const eased = progress * progress * (3 - 2 * progress);
                const y = from + (target - from) * eased;
                scrollOffset.current = y;
                scrollRef.current?.scrollTo({ y, animated: false });
                scrollFrame.current =
                    progress < 1 ? requestAnimationFrame(tick) : undefined;
            };
            scrollFrame.current = requestAnimationFrame(tick);
        },
        [cancelScroll, currentIndex, reducedMotion, viewportHeight]
    );
    useEffect(() => centerActiveLine(), [centerActiveLine, lyrics]);

    const goToLine = (index: number): void => {
        const timestamp = lyrics?.lines[index].timestamp_s;
        if (timestamp !== undefined && timestamp !== null) {
            seekTo(lyricSeekTime(timestamp, lyrics?.offset));
        }
    };

    return (
        <ScrollView
            ref={scrollRef}
            testID="lyrics-scroll"
            style={styles.scroll}
            scrollEventThrottle={16}
            onScroll={({ nativeEvent }) => {
                scrollOffset.current = nativeEvent.contentOffset.y;
            }}
            onScrollBeginDrag={cancelScroll}
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
                    <LyricLine
                        key={index}
                        reducedMotion={reducedMotion}
                        color={
                            currentIndex === index
                                ? theme.colors["foreground-strong"]
                                : withAlpha(
                                      theme.colors["foreground-strong"],
                                      currentIndex !== null &&
                                          index < currentIndex
                                          ? 0.2
                                          : 0.35
                                  )
                        }
                        testID={
                            currentIndex === index ? "active-lyric" : undefined
                        }
                        onLayout={({ nativeEvent }) => {
                            lineLayouts.current.set(index, nativeEvent.layout);
                            if (index === currentIndex) centerActiveLine(false);
                        }}
                        onPress={() => goToLine(index)}
                        style={styles.lyricLine}
                    >
                        {currentIndex === index && line.words?.length
                            ? line.words.map((word, wordIndex) => {
                                  const state = lyricWordState(
                                      word,
                                      currentTime,
                                      lyrics.offset,
                                      line.words[wordIndex + 1]?.timestamp_s ??
                                          line.end_timestamp_s
                                  );
                                  return (
                                      <Text
                                          key={wordIndex}
                                          style={{
                                              color:
                                                  state === "active"
                                                      ? theme.colors.primary
                                                      : state === "past"
                                                        ? theme.colors[
                                                              "foreground-strong"
                                                          ]
                                                        : withAlpha(
                                                              theme.colors[
                                                                  "foreground-strong"
                                                              ],
                                                              0.35
                                                          ),
                                          }}
                                      >
                                          {word.text}
                                      </Text>
                                  );
                              })
                            : line.text}
                    </LyricLine>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerLabel}>
                        {vocabulary.LYRICS_BY}
                    </Text>
                    <Text style={styles.footerProvider}>{lyrics.provider}</Text>
                    <Text style={styles.footerId}>{lyrics.publicId}</Text>
                </View>
            </View>
        </ScrollView>
    );
}
const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
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
