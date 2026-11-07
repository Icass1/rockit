import { useEffect, useState, type ReactNode } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { BookOpen, Download, Home, Search, Settings } from "@rockit/ui/icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import {
    Pressable,
    StyleSheet,
    View,
    type LayoutChangeEvent,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { ContextMenuProvider } from "@/lib/ContextMenuContext";
import { ModalProvider } from "@/lib/ModalContext";
import { PlayerProvider, usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { getSession } from "@/lib/session";
import { SheetProvider } from "@/lib/SheetContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import { useVocabulary } from "@/lib/vocabulary";
import Header from "@/components/layout/Header";
import { FullPlayer, MiniPlayer } from "@/components/Player";

function StandaloneTabBar({ onTabPress }: { onTabPress?: () => void }) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const segments = useSegments();

    const activeTab = segments.at(1) || "index";

    const tabs = [
        {
            name: "index",
            label: vocabulary.HOME,
            icon: Home,
            path: "/(app)" as const,
        },
        {
            name: "library",
            label: vocabulary.LIBRARY,
            icon: BookOpen,
            path: "/(app)/library" as const,
        },
        {
            name: "search",
            label: vocabulary.SEARCH,
            icon: Search,
            path: "/(app)/search" as const,
        },
        {
            name: "downloader",
            label: vocabulary.DOWNLOADS,
            icon: Download,
            path: "/(app)/downloader" as const,
        },
        {
            name: "settings",
            label: vocabulary.SETTINGS,
            icon: Settings,
            path: "/(app)/settings" as const,
        },
    ];

    return (
        <SafeAreaView
            edges={["bottom"]}
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.legacy.bgCard,
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
                            accessibilityLabel={tab.label}
                            accessibilityState={{ selected: isFocused }}
                        >
                            <tab.icon
                                color={
                                    isFocused
                                        ? theme.legacy.accent
                                        : theme.legacy.gray400
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        tabBar: {
            flexDirection: "row",
            width: "100%",
            backgroundColor: theme.legacy.bgCard,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.legacy.gray800,
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
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void getSession()
            .then(async (session) => {
                if (cancelled) return;
                if (!session) {
                    rockIt.stop();
                    router.replace("/(auth)/login");
                } else {
                    await rockIt.init(session);
                    if (!cancelled) setReady(true);
                }
            })
            .catch((error) =>
                console.error("Session initialization failed", error)
            );
        return () => {
            cancelled = true;
        };
    }, [router]);

    if (!ready)
        return <View accessibilityRole="progressbar" style={{ flex: 1 }} />;

    return <AppLayoutInner safeBottom={safeBottom} vocabulary={vocabulary} />;
}

// Inner component that runs inside PlayerProvider so usePlayer works correctly
function AppLayoutInner({
    safeBottom,
    vocabulary,
}: {
    safeBottom: number;
    vocabulary: any;
}) {
    const { hidePlayer } = usePlayer();
    return (
        <View style={{ flex: 1 }}>
            <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: vocabulary.HOME,
                        tabBarIcon: ({ color, size }) => (
                            <Home color={String(color)} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="library"
                    options={{
                        title: vocabulary.LIBRARY,
                        tabBarIcon: ({ color, size }) => (
                            <BookOpen color={String(color)} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="search"
                    options={{
                        title: vocabulary.SEARCH,
                        tabBarIcon: ({ color, size }) => (
                            <Search color={String(color)} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="downloader"
                    options={{
                        title: vocabulary.DOWNLOADS,
                        tabBarIcon: ({ color, size }) => (
                            <Download color={String(color)} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: vocabulary.SETTINGS,
                        tabBarIcon: ({ color, size }) => (
                            <Settings color={String(color)} size={size} />
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
        </View>
    );
}

function VersionCheckWrapper({ children }: { children: ReactNode }) {
    useVersionCheck();
    return children;
}

export default function AppLayout() {
    return (
        <PlayerProvider>
            <GestureHandlerRootView
                style={{ flex: 1 }}
                onLayout={({ nativeEvent }: LayoutChangeEvent) =>
                    logSheetDebug("appHost.layout", { ...nativeEvent.layout })
                }
            >
                <SheetProvider>
                    <ContextMenuProvider>
                        <ModalProvider>
                            <VersionCheckWrapper>
                                <AppLayoutContent />
                            </VersionCheckWrapper>
                        </ModalProvider>
                    </ContextMenuProvider>
                </SheetProvider>
            </GestureHandlerRootView>
        </PlayerProvider>
    );
}
