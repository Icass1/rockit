import { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlayer, usePlayerTime } from "@/lib/PlayerContext";

interface LyricsLine {
    text: string;
    time?: number;
}

type LyricsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "empty" }
    | { status: "ready"; lines: LyricsLine[]; dynamic: boolean };

/**
 * PlayerLyrics — inline lyrics panel rendered inside the tabs panel.
 * Replaces the old BottomSheet-based implementation.
 * Dynamic (synced) lyrics are ready to wire in; static display works today.
 */
export default function PlayerLyrics() {
    const { currentMedia } = usePlayer();
    const { currentTime } = usePlayerTime();
    const [lyricsState, setLyricsState] = useState<LyricsState>({
        status: "idle",
    });

    useEffect(() => {
        if (!currentMedia?.publicId) {
            setLyricsState({ status: "idle" });
            return;
        }

        setLyricsState({ status: "loading" });

        // TODO: fetch from your lyrics API endpoint, e.g.:
        // fetchLyrics(currentMedia.publicId)
        //   .then(lines => setLyricsState({ status: "ready", lines, dynamic: true }))
        //   .catch(() => setLyricsState({ status: "empty" }));

        // Stub: show "no lyrics" for now
        setLyricsState({ status: "empty" });
    }, [currentMedia?.publicId]);

    // Highlights the active line for synced lyrics
    const activeIndex = useMemo(() => {
        if (lyricsState.status !== "ready" || !lyricsState.dynamic) return -1;
        let idx = 0;
        for (let i = 0; i < lyricsState.lines.length; i++) {
            const t = lyricsState.lines[i].time;
            if (t !== undefined && t <= currentTime + 0.3) idx = i;
        }
        return idx;
    }, [lyricsState, currentTime]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Lyrics</Text>
                {currentMedia && (
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {currentMedia.name}
                        {currentMedia.artists[0]?.name
                            ? ` — ${currentMedia.artists[0].name}`
                            : ""}
                    </Text>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {lyricsState.status === "loading" && (
                    <Text style={styles.stateText}>Loading lyrics…</Text>
                )}

                {(lyricsState.status === "empty" ||
                    lyricsState.status === "idle") && (
                    <Text style={styles.stateText}>No lyrics available</Text>
                )}

                {lyricsState.status === "ready" &&
                    lyricsState.lines.map((line, i) => (
                        <Text
                            key={i}
                            style={[
                                styles.lyricLine,
                                lyricsState.dynamic &&
                                    i === activeIndex &&
                                    styles.lyricLineActive,
                                lyricsState.dynamic &&
                                    i < activeIndex &&
                                    styles.lyricLinePast,
                            ]}
                        >
                            {line.text}
                        </Text>
                    ))}
            </ScrollView>
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
    content: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 60,
    },
    stateText: {
        fontSize: 16,
        color: COLORS.gray400,
        textAlign: "center",
        marginTop: 48,
    },
    lyricLine: {
        fontSize: 22,
        fontWeight: "600",
        color: "rgba(255,255,255,0.35)",
        lineHeight: 36,
        marginBottom: 8,
    },
    lyricLineActive: {
        color: COLORS.white,
        fontSize: 26,
        fontWeight: "700",
    },
    lyricLinePast: {
        color: "rgba(255,255,255,0.2)",
    },
});
