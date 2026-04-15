import { useEffect } from "react";
import { COLORS } from "@/constants/theme";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs, useRouter } from "expo-router";
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
import { PlayerProvider } from "@/lib/PlayerContext";
import { getSession } from "@/lib/session";
import { useVocabulary } from "@/lib/vocabulary";
import ContextMenuSheet from "@/components/ContextMenu/ContextMenuSheet";
import Header from "@/components/layout/Header";
import { FullPlayer, MiniPlayer } from "@/components/Player";
import UpdateModal from "@/components/UpdateModal";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <SafeAreaView
            edges={["bottom"]}
            style={{ backgroundColor: COLORS.bgCard }}
        >
            <>
                <View style={styles.tabBar}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        if (!options.tabBarIcon) return null;
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: "tabPress",
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <Pressable
                                key={route.key}
                                onPress={onPress}
                                style={styles.tabItem}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isFocused }}
                            >
                                {options.tabBarIcon?.({
                                    color: isFocused
                                        ? COLORS.accent
                                        : COLORS.gray400,
                                    size: 22,
                                    focused: isFocused,
                                })}
                            </Pressable>
                        );
                    })}
                </View>
            </>
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
        zIndex: 1000,
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
    const { config, sheetRef } = useContextMenu();
    const { updateAvailable, apkUrl, latestVersion } = useVersionCheck();

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
                updateAvailable={updateAvailable}
                apkUrl={apkUrl}
                latestVersion={latestVersion}
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
    updateAvailable,
    apkUrl,
    latestVersion,
}: {
    safeBottom: number;
    vocabulary: any;
    config: any;
    sheetRef: any;
    updateAvailable: boolean;
    apkUrl: string | null;
    latestVersion: string | null;
}) {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={(props) => <CustomTabBar {...props} />}
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

            <UpdateModal
                visible={updateAvailable}
                apkUrl={apkUrl}
                latestVersion={latestVersion}
            />

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
            <ContextMenuSheet config={config} sheetRef={sheetRef} />
        </View>
    );
}

export default function AppLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
                <ContextMenuProvider>
                    <AppLayoutContent />
                </ContextMenuProvider>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}
