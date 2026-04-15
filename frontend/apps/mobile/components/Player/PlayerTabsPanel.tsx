import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/constants/theme";
import { Radio } from "lucide-react-native";
import {
    Animated,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import CrossfadeSettings from "../Settings/CrossfadeSettings";
import type { PlayerTab } from "./FullPlayer";
import PlayerLyrics from "./PlayerLyrics";
import PlayerQueue from "./PlayerQueue";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PANEL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.65);

interface PlayerTabsPanelProps {
    activeTab: PlayerTab;
    onClose: () => void;
}

export default function PlayerTabsPanel({
    activeTab,
    onClose,
}: PlayerTabsPanelProps) {
    const translateY = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    // renderedTab keeps the last active tab alive while the panel animates out
    const [renderedTab, setRenderedTab] = useState<PlayerTab>(null);

    useEffect(() => {
        if (activeTab) {
            setRenderedTab(activeTab);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                damping: 50,
                stiffness: 300,
                mass: 0.8,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: PANEL_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setRenderedTab(null);
            });
        }
    }, [activeTab, translateY]);

    // Nothing to render when panel is fully off-screen
    if (!renderedTab && !activeTab) return null;

    return (
        <Animated.View
            style={[styles.panel, { transform: [{ translateY }] }]}
            // Disable touches while sliding out
            pointerEvents={activeTab ? "auto" : "none"}
        >
            {/* Drag handle — tap to close */}
            <Pressable style={styles.handleArea} onPress={onClose}>
                <View style={styles.handleBar} />
            </Pressable>

            {/* Tab content */}
            <View style={styles.content}>
                {renderedTab === "queue" && <PlayerQueue />}
                {renderedTab === "lyrics" && <PlayerLyrics />}
                {renderedTab === "related" && <RelatedMock />}
                {renderedTab === "crossfade" && (
                    <View style={styles.crossfadeWrapper}>
                        <Text style={styles.crossfadeTitle}>Crossfade</Text>
                        <CrossfadeSettings />
                    </View>
                )}
            </View>
        </Animated.View>
    );
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
    panel: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: PANEL_HEIGHT,
        backgroundColor: "#1c1c1c",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 200,
        overflow: "hidden",
        // Subtle shadow to separate from the player below
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 16,
    },
    handleArea: {
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 4,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    content: {
        flex: 1,
    },
    crossfadeWrapper: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
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
    mockTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    mockSubtitle: {
        fontSize: 14,
        color: COLORS.gray400,
    },
});
