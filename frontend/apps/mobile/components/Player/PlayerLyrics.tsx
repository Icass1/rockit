import { useCallback, useEffect, useMemo, useState } from "react";
import { COLORS } from "@/constants/theme";
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { StyleSheet, Text, View } from "react-native";
import { usePlayer } from "@/lib/PlayerContext";

interface LyricsLine {
    text: string;
    time?: number;
}

type LyricsState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "empty" }
    | { status: "ready"; lines: LyricsLine[]; dynamic: boolean };

interface PlayerLyricsProps {
    sheetRef: React.RefObject<any>;
}

export default function PlayerLyrics({ sheetRef }: PlayerLyricsProps) {
    const { currentMedia, currentTime } = usePlayer();
    const [lyricsState, setLyricsState] = useState<LyricsState>({
        status: "idle",
    });
    const snapPoints = useMemo(() => ["60%", "92%"], []);

    useEffect(() => {
        if (!currentMedia?.publicId) {
            setLyricsState({ status: "idle" });
            return;
        }

        setLyricsState({ status: "loading" });

        setLyricsState({ status: "empty" });
    }, [currentMedia?.publicId]);

    const activeIndex = useMemo(() => {
        if (lyricsState.status !== "ready" || !lyricsState.dynamic) return -1;
        let idx = 0;
        for (let i = 0; i < lyricsState.lines.length; i++) {
            const t = lyricsState.lines[i].time;
            if (t !== undefined && t <= currentTime + 0.3) {
                idx = i;
            }
        }
        return idx;
    }, [lyricsState, currentTime]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    return (
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.background}
            handleIndicatorStyle={styles.handle}
            containerStyle={{ zIndex: 200, elevation: 200 }}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Lyrics</Text>
                {currentMedia && (
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {currentMedia.name} — {currentMedia.artists[0]?.name}
                    </Text>
                )}
            </View>

            <BottomSheetScrollView contentContainerStyle={styles.content}>
                {lyricsState.status === "loading" && (
                    <Text style={styles.emptyText}>Loading lyrics…</Text>
                )}
                {lyricsState.status === "empty" && (
                    <Text style={styles.emptyText}>No lyrics available</Text>
                )}
                {lyricsState.status === "ready" &&
                    lyricsState.lines.map((line, i) => (
                        <Text
                            key={i}
                            style={[
                                styles.lyricLine,
                                lyricsState.dynamic && i === activeIndex
                                    ? styles.lyricLineActive
                                    : null,
                                lyricsState.dynamic && i < activeIndex
                                    ? styles.lyricLinePast
                                    : null,
                            ]}
                        >
                            {line.text}
                        </Text>
                    ))}
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: "#1c1c1e",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        backgroundColor: "rgba(255,255,255,0.25)",
        width: 36,
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
        paddingTop: 16,
        paddingBottom: 60,
    },
    emptyText: {
        color: COLORS.gray400,
        fontSize: 16,
        textAlign: "center",
        marginTop: 40,
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
