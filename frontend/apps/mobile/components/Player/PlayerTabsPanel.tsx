import { useEffect, useMemo, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Radio } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSheet } from "@/lib/SheetContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import BookmarkPopup from "@/components/Player/BookmarkPopup";
import type { PlayerTab } from "@/components/Player/FullPlayer";
import PlayerLyrics from "@/components/Player/PlayerLyrics";
import PlayerQueue from "@/components/Player/PlayerQueue";
import CrossfadeSettings from "@/components/Settings/CrossfadeSettings";

interface PlayerTabsPanelProps {
    activeTab: PlayerTab;
    onClose: () => void;
}

export default function PlayerTabsPanel({
    activeTab,
    onClose,
}: PlayerTabsPanelProps) {
    const { open, close } = useSheet();
    const hasOpenSheet = useRef(false);
    const content = useMemo(() => {
        if (activeTab === "bookmarks") return <BookmarkPopup onClose={close} />;
        if (activeTab === "queue") return <PlayerQueue />;
        if (activeTab === "lyrics") return <PlayerLyrics />;
        if (activeTab === "crossfade") {
            return (
                <View style={styles.crossfadeWrapper}>
                    <Text style={styles.crossfadeTitle}>Crossfade</Text>
                    <CrossfadeSettings />
                </View>
            );
        }
        if (activeTab === "related") return <RelatedMock />;
        return null;
    }, [activeTab, close]);

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
            content,
            snapPoints: ["65%"],
            onClose: () => {
                // Dismissal already closed the sheet before clearing the tab.
                hasOpenSheet.current = false;
                onClose();
            },
            debugLabel: `player-${activeTab}`,
        });
    }, [activeTab, close, content, onClose, open]);

    return null;
}

function RelatedMock() {
    return (
        <View style={styles.mockContainer}>
            <Radio size={40} color={COLORS.gray400} />
            <Text style={styles.mockTitle}>Related songs</Text>
            <Text style={styles.mockSubtitle}>Coming soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    crossfadeWrapper: { paddingHorizontal: 20, paddingTop: 8 },
    crossfadeTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
        marginBottom: 12,
    },
    mockContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    mockTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
    mockSubtitle: { fontSize: 14, color: COLORS.gray400 },
});
