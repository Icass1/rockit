import { useEffect, useMemo, useRef } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheet } from "@/lib/SheetContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import { useVocabulary } from "@/lib/vocabulary";
import BookmarkPopup from "@/components/Player/BookmarkPopup";
import type { PlayerTab } from "@/components/Player/FullPlayer";
import PlayerLyrics from "@/components/Player/PlayerLyrics";
import PlayerQueue from "@/components/Player/PlayerQueue";
import PlayerRelated from "@/components/Player/PlayerRelated";
import CrossfadeSettings from "@/components/Settings/CrossfadeSettings";

interface PlayerTabsPanelProps {
    activeTab: PlayerTab;
    onClose: () => void;
}

export default function PlayerTabsPanel({
    activeTab,
    onClose,
}: PlayerTabsPanelProps) {
    const styles = useThemedStyles(createStyles);
    const theme = useDesignTheme();
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const panelHeight =
        (height * theme.layout.playerPanelPercent) / 100 -
        theme.layout.sheetHandleHeight;
    const { vocabulary } = useVocabulary();
    const { open, close } = useSheet();
    const hasOpenSheet = useRef(false);
    const content = useMemo(() => {
        if (activeTab === "bookmarks") return <BookmarkPopup onClose={close} />;
        if (activeTab === "queue") return <PlayerQueue />;
        if (activeTab === "lyrics") return <PlayerLyrics />;
        if (activeTab === "crossfade") {
            return (
                <View style={styles.crossfadeWrapper}>
                    <Text style={styles.crossfadeTitle}>
                        {vocabulary.AUDIO_TRANSITIONS}
                    </Text>
                    <CrossfadeSettings />
                </View>
            );
        }
        if (activeTab === "related") return <PlayerRelated />;
        return null;
    }, [activeTab, close, styles, vocabulary]);

    useEffect(() => {
        logSheetDebug("playerTabs.effect", {
            activeTab,
            hasContent: !!content,
        });
        if (!activeTab || !content) {
            if (hasOpenSheet.current) {
                hasOpenSheet.current = false;
                close();
            }
            return;
        }
        hasOpenSheet.current = true;
        open({
            // BottomSheetView also covers an offscreen overdrag area. Keep each
            // player's scroll viewport inside the visible snap point instead.
            content: (
                <View
                    style={{
                        height: panelHeight,
                        paddingBottom: insets.bottom,
                    }}
                >
                    {content}
                </View>
            ),
            snapPoints: [`${theme.layout.playerPanelPercent}%`],
            onClose: () => {
                // Dismissal already closed the sheet before clearing the tab.
                hasOpenSheet.current = false;
                onClose();
            },
            debugLabel: `player-${activeTab}`,
        });
    }, [
        activeTab,
        close,
        content,
        onClose,
        open,
        panelHeight,
        insets.bottom,
        theme.layout.playerPanelPercent,
    ]);

    return null;
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        crossfadeWrapper: {
            paddingHorizontal: 20,
            paddingTop: theme.spacing.sm,
        },
        crossfadeTitle: {
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            color: theme.legacy.white,
            marginBottom: theme.spacing.md,
        },
    });
