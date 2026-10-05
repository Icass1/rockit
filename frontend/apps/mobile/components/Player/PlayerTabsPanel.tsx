import { useEffect, useMemo } from "react";
import { COLORS } from "@/constants/theme";
import { Radio } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSheet } from "@/lib/SheetContext";
import type { PlayerTab } from "@/components/Player/FullPlayer";
import PlayerLyrics from "@/components/Player/PlayerLyrics";
import PlayerQueue from "@/components/Player/PlayerQueue";
import CrossfadeSettings from "@/components/Settings/CrossfadeSettings";

interface PlayerTabsPanelProps {
    activeTab: PlayerTab;
    onClose: () => void;
}

export default function PlayerTabsPanel({ activeTab, onClose }: PlayerTabsPanelProps) {
    const { open, close } = useSheet();
    const content = useMemo(() => {
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
    }, [activeTab]);

    useEffect(() => {
        if (!activeTab || !content) {
            close();
            return;
        }
        open({ content, snapPoints: ["65%"], onClose });
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
    crossfadeTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white, marginBottom: 12 },
    mockContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    mockTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
    mockSubtitle: { fontSize: 14, color: COLORS.gray400 },
});
