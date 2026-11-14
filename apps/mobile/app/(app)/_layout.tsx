import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import type { Vocabulary } from "@rockit/shared";
import {
    ActionButton,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import {
    BookOpen,
    Download,
    Home,
    Search,
    Settings,
    Users,
} from "@rockit/ui/icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { ContextMenuProvider } from "@/lib/ContextMenuContext";
import { ModalProvider } from "@/lib/ModalContext";
import { PlayerProvider, usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { getSession } from "@/lib/session";
import { SheetProvider } from "@/lib/SheetContext";
import { logSheetDebug } from "@/lib/sheetDebug";
import { useVocabulary } from "@/lib/vocabulary";
import ShareMediaComposer from "@/components/Friends/ShareMediaComposer";
import Header from "@/components/layout/Header";
import { FullPlayer, MiniPlayer } from "@/components/Player";

function StandaloneTabBar({ onTabPress }: { onTabPress?: () => void }) {
    const { bottom: safeBottom } = useSafeAreaInsets();
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const segments = useSegments();

    const route = segments.at(1) || "index";
    const activeTab =
        route === "downloader"
            ? "library"
            : route === "radio"
              ? "search"
              : route === "stats"
                ? "settings"
                : route;

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
            name: "friends",
            label: vocabulary.FRIENDS,
            icon: Users,
            path: "/(app)/friends" as const,
        },
        {
            name: "settings",
            label: vocabulary.SETTINGS,
            icon: Settings,
            path: "/(app)/settings" as const,
        },
    ];

    return (
        <View
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.legacy.bgCard,
                paddingBottom: safeBottom,
                zIndex: 1000,
            }}
        >
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isFocused = activeTab === tab.name;
                    return (
                        <Pressable
                            key={tab.name}
                            testID={`navigation-${tab.name}`}
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
                            aria-pressed={isFocused}
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
        </View>
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
            height: theme.layout.tabBar,
        },
        tabItem: {
            flex: 1,
            minHeight: theme.layout.touchTarget,
            alignItems: "center",
            justifyContent: "center",
        },
    });

function AppLayoutContent() {
    const router = useRouter();
    const { bottom: safeBottom } = useSafeAreaInsets();
    const { vocabulary } = useVocabulary();
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const theme = useDesignTheme();

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
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [router, attempt]);

    if (!ready)
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.colors.background,
                    gap: theme.spacing.lg,
                }}
            >
                {failed ? (
                    <>
                        <Text style={{ color: theme.colors.destructive }}>
                            {vocabulary.ERROR}
                        </Text>
                        <ActionButton
                            label={vocabulary.RETRY}
                            onPress={() => {
                                setFailed(false);
                                setAttempt((value) => value + 1);
                            }}
                        />
                    </>
                ) : (
                    <View
                        accessibilityRole="progressbar"
                        accessibilityLabel={vocabulary.MOBILE_LOADING}
                    />
                )}
            </View>
        );

    return <AppLayoutInner safeBottom={safeBottom} vocabulary={vocabulary} />;
}

// Inner component that runs inside PlayerProvider so usePlayer works correctly
function AppLayoutInner({
    safeBottom,
    vocabulary,
}: {
    safeBottom: number;
    vocabulary: Vocabulary;
}) {
    const { hidePlayer, currentMedia } = usePlayer();
    const pendingSelection = useStore(rockIt.queueManager.pendingSelectionAtom);
    const theme = useDesignTheme();
    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View
                style={{
                    flex: 1,
                    marginBottom:
                        theme.layout.tabBar +
                        safeBottom +
                        (currentMedia || pendingSelection
                            ? theme.layout.miniPlayerHeight +
                              theme.layout.miniPlayerGap
                            : 0),
                }}
            >
                <Tabs
                    tabBar={() => null}
                    screenOptions={{
                        headerShown: false,
                        sceneStyle: {
                            backgroundColor: theme.colors.background,
                        },
                    }}
                >
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
                        name="radio"
                        options={{ title: vocabulary.RADIO }}
                    />
                    <Tabs.Screen
                        name="friends"
                        options={{ title: vocabulary.FRIENDS }}
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
            </View>

            <ShareMediaComposer />
            <FullPlayer />
            <StandaloneTabBar onTabPress={hidePlayer} />
            {/* MiniPlayer always rendered – its opacity animates based on FullPlayer visibility */}
            <View
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom:
                        theme.layout.tabBar +
                        safeBottom +
                        theme.layout.miniPlayerGap,
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
                <Header showNotifications />
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
