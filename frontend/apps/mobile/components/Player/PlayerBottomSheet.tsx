// Bottom sheet for player tabs (Queue, Lyrics, Related, Crossfade)
import { useCallback, useEffect, useMemo, useRef } from "react";
import { COLORS } from "@/constants/theme";
import BottomSheet, {
    BottomSheetBackdrop,
    type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Radio } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { PlayerTab } from "./FullPlayer";
import PlayerLyrics from "./PlayerLyrics";
import PlayerQueue from "./PlayerQueue";
import PlayerTabsBar from "./PlayerTabsBar";

type PlayerBottomSheetProps = {
    activeTab: PlayerTab;
    setActiveTab: (value: PlayerTab | ((prev: PlayerTab) => PlayerTab)) => void;
    insetBottom: number;
};

export default function PlayerBottomSheet({
    activeTab,
    setActiveTab,
    insetBottom,
}: PlayerBottomSheetProps) {
    const SNAP_POINTS = useMemo(() => ["65%"], []);
    const sheetRef = useRef<BottomSheet>(null);

    // Imperatively open/close to avoid onChange(-1) firing during the open
    // animation when using a reactive index prop, which would reset activeTab.
    useEffect(() => {
        if (activeTab) {
            sheetRef.current?.snapToIndex(0);
        } else {
            sheetRef.current?.close();
        }
    }, [activeTab]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    const handleSheetChange = (index: number) => {
        if (index === -1) {
            setActiveTab(null);
        }
    };

    const handleTabPress = (tab: PlayerTab) => {
        setActiveTab((prev) => (prev === tab ? null : tab));
    };

    return (
        <BottomSheet
            ref={sheetRef}
            snapPoints={SNAP_POINTS}
            index={-1}
            onChange={handleSheetChange}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            handleIndicatorStyle={{ backgroundColor: COLORS.gray600 }}
            backgroundStyle={styles.sheetBackground}
            style={styles.modal}
        >
            {/* Internal tabs bar */}
            <PlayerTabsBar
                activeTab={activeTab}
                onTabPress={handleTabPress}
                insetBottom={insetBottom}
            />

            {/* Tab content */}
            <View style={styles.content}>
                {activeTab === "queue" && <PlayerQueue />}
                {activeTab === "lyrics" && <PlayerLyrics />}
                {activeTab === "related" && <RelatedMock />}
            </View>
        </BottomSheet>
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
    sheetBackground: {
        backgroundColor: "#1c1c1c",
    },
    modal: {
        zIndex: 600,
        elevation: 16,
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
