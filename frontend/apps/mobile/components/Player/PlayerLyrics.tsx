import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import { type BaseDynamicLyricsResponse } from "@/dto";
import { getMediaArtists } from "@/shared/index";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";
import { useVocabulary } from "@/lib/vocabulary";

export default function PlayerLyrics() {
    const { currentMedia, seekTo } = usePlayer();
    const { currentTime } = usePlayerTime();
    const { vocabulary } = useVocabulary();

    const [lyrics, setLyrics] = useState<BaseDynamicLyricsResponse>();
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!currentMedia) return;

        setLoading(true);

        Http.getDynamicLyricsAsync(currentMedia.publicId).then((response) => {
            if (response.isOk()) {
                setLyrics(response.result);
            }
            setLoading(false);
        });
    }, [currentMedia]);

    const currentIndex = useMemo(() => {
        if (!lyrics || !currentTime) return null;

        const offset = lyrics.offset;

        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            if (currentTime >= lyrics.lines[i].timestamp_s - offset) {
                return i;
            }
        }

        return null;
    }, [lyrics, currentTime]);

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
        if (timestamp !== undefined) {
            seekTo(timestamp);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Lyrics</Text>
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
                    <Text style={styles.stateText}>Loading lyrics...</Text>
                </View>
            )}

            {!loading && !lyrics && (
                <View style={styles.centerContent}>
                    <Text style={styles.stateText}>No lyrics available</Text>
                </View>
            )}

            {!loading && lyrics && (
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 13,
        color: COLORS.gray400,
        marginTop: 2,
    },
    centerContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    stateText: {
        fontSize: 16,
        color: COLORS.gray400,
        textAlign: "center",
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 120,
    },
    lyricLine: {
        fontSize: 22,
        fontWeight: "600",
        color: "rgba(255,255,255,0.35)",
        lineHeight: 36,
        marginBottom: 8,
        paddingRight: 16,
    },
    lyricLineActive: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: "700",
    },
    lyricLinePast: {
        color: "rgba(255,255,255,0.2)",
    },
    footer: {
        alignItems: "center",
        marginTop: 96,
        gap: 12,
    },
    footerLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.gray400,
    },
    footerProvider: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray400,
    },
    footerId: {
        fontSize: 11,
        color: COLORS.gray600,
    },
});
