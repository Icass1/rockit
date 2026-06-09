import { useEffect, type ReactNode } from "react";
import { COLORS } from "@/constants/theme";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Tabs, useRouter, useSegments } from "expo-router";
import {
    BookOpen,
    Download,
    Home,
    Search,
    Settings,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { ContextMenuProvider, useContextMenu } from "@/lib/ContextMenuContext";
import { ModalProvider } from "@/lib/ModalContext";
import { PlayerProvider, usePlayer } from "@/lib/PlayerContext";
import { getSession } from "@/lib/session";
import { useVocabulary } from "@/lib/vocabulary";
import ContextMenuSheet from "@/components/ContextMenu/ContextMenuSheet";
import Header from "@/components/layout/Header";
import { FullPlayer, MiniPlayer } from "@/components/Player";

function StandaloneTabBar({ onTabPress }: { onTabPress?: () => void }) {
    const router = useRouter();
    const segments = useSegments();

    const activeTab = segments[1] || "index";

    const tabs = [
        { name: "index", icon: Home, path: "/(app)" as const },
        { name: "library", icon: BookOpen, path: "/(app)/library" as const },
        { name: "search", icon: Search, path: "/(app)/search" as const },
        { name: "downloader", icon: Download, path: "/(app)/downloader" as const },
        { name: "settings", icon: Settings, path: "/(app)/settings" as const },
    ];

    return (
        <SafeAreaView
            edges={["bottom"]}
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: COLORS.bgCard,
                zIndex: 1000,
            }}
        >
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isFocused = activeTab === tab.name;
                    return (
                        <Pressable
                            key={tab.name}
                            onPress={() => {
                                if (!isFocused) {
                                    onTabPress?.();
                                    router.replace(tab.path);
                                }
                            }}
                            style={styles.tabItem}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isFocused }}
                        >
                            <tab.icon
                                color={
                                    isFocused ? COLORS.accent : COLORS.gray400
                                }
                                size={22}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: "row",
        width: "100%",
        backgroundColor: COLORS.bgCard,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.gray800,
        height: 50,
    },
    tabItem: {
        flex: 1,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
    },
});

function AppLayoutContent() {
    const router = useRouter();
    const { bottom: safeBottom } = useSafeAreaInsets();
    const { vocabulary } = useVocabulary();
    const { config, sheetRef, handleSheetChange } = useContextMenu();

    useEffect(() => {
        getSession().then((session) => {
            if (!session) {
                router.replace("/(auth)/login");
            }
        });
    }, [router]);

    return (
        <PlayerProvider>
            <AppLayoutInner
                safeBottom={safeBottom}
                vocabulary={vocabulary}
                config={config}
                sheetRef={sheetRef}
                handleSheetChange={handleSheetChange}
            />
        </PlayerProvider>
    );
}

// Inner component that runs inside PlayerProvider so usePlayer works correctly
function AppLayoutInner({
    safeBottom,
    vocabulary,
    config,
    sheetRef,
    handleSheetChange,
}: {
    safeBottom: number;
    vocabulary: any;
    config: any;
    sheetRef: any;
    handleSheetChange: (index: number) => void;
}) {
    const { hidePlayer } = usePlayer();
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={() => null}
                screenOptions={{ headerShown: false }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: vocabulary.HOME,
                        tabBarIcon: ({ color, size }) => (
                            <Home color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="library"
                    options={{
                        title: vocabulary.LIBRARY,
                        tabBarIcon: ({ color, size }) => (
                            <BookOpen color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="search"
                    options={{
                        title: vocabulary.SEARCH,
                        tabBarIcon: ({ color, size }) => (
                            <Search color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="downloader"
                    options={{
                        title: vocabulary.DOWNLOADS,
                        tabBarIcon: ({ color, size }) => (
                            <Download color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: vocabulary.SETTINGS,
                        tabBarIcon: ({ color, size }) => (
                            <Settings color={color} size={size} />
                        ),
                    }}
                />
            </Tabs>

            <FullPlayer />
            <StandaloneTabBar onTabPress={hidePlayer} />
            {/* MiniPlayer always rendered – its opacity animates based on FullPlayer visibility */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 50 + safeBottom + 12,
                    zIndex: 400,
                }}
            >
                <MiniPlayer />
            </View>

            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    pointerEvents: "box-none",
                }}
            >
                <Header />
            </View>
            <ContextMenuSheet
                config={config}
                sheetRef={sheetRef}
                onChange={handleSheetChange}
            />
        </View>
    );
}

function VersionCheckWrapper({ children }: { children: ReactNode }) {
    useVersionCheck();
    return children;
}

export default function AppLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <ContextMenuProvider>
                    <ModalProvider>
                        <VersionCheckWrapper>
                            <AppLayoutContent />
                        </VersionCheckWrapper>
                    </ModalProvider>
                </ContextMenuProvider>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}
