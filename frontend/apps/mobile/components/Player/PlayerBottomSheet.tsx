// Bottom sheet for player tabs (Queue, Lyrics, Related, Crossfade)
import { useCallback, useEffect, useMemo, useRef } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { StyleSheet, Text, View } from "react-native";
import type { PlayerTab } from "./FullPlayer";
import PlayerLyrics from "./PlayerLyrics";
import PlayerQueue from "./PlayerQueue";
import PlayerTabsBar from "./PlayerTabsBar";

type PlayerBottomSheetProps = {
    activeTab: PlayerTab;
    // Accept either a direct value or a updater function, mirroring React's setState signature
    setActiveTab: (value: PlayerTab | ((prev: PlayerTab) => PlayerTab)) => void;
    insetBottom: number;
};

export default function PlayerBottomSheet({
    activeTab,
    setActiveTab,
    insetBottom,
}: PlayerBottomSheetProps) {
    const bottomSheetRef = useRef<any>(null);
    const SNAP_POINTS = useMemo(() => ["65%"], []);

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

    // Open or close based on activeTab
    useEffect(() => {
        if (activeTab) {
            bottomSheetRef.current?.present();
        } else {
            bottomSheetRef.current?.dismiss();
        }
    }, [activeTab]);

    const handleClose = () => {
        // Reset active tab when sheet is dismissed
        setActiveTab(null);
    };

    const handleTabPress = (tab: PlayerTab) => {
        setActiveTab((prev) => (prev === tab ? null : tab));
    };

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={SNAP_POINTS}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: COLORS.gray600 }}
            backgroundStyle={styles.sheetBackground}
            onDismiss={handleClose}
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
        </BottomSheetModal>
    );
}

function RelatedMock() {
    return (
        <View style={styles.mockContainer}>
            <Feather name="radio" size={40} color={COLORS.gray400} />
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
