import { useEffect } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
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
            <MiniPlayer />
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
                                <Feather
                                    name="home"
                                    color={color}
                                    size={size}
                                />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="library"
                        options={{
                            title: vocabulary.LIBRARY,
                            tabBarIcon: ({ color, size }) => (
                                <Feather
                                    name="book-open"
                                    color={color}
                                    size={size}
                                />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="search"
                        options={{
                            title: vocabulary.SEARCH,
                            tabBarIcon: ({ color, size }) => (
                                <Feather
                                    name="search"
                                    color={color}
                                    size={size}
                                />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="downloader"
                        options={{
                            title: vocabulary.DOWNLOADS,
                            tabBarIcon: ({ color, size }) => (
                                <Feather
                                    name="download"
                                    color={color}
                                    size={size}
                                />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="settings"
                        options={{
                            title: vocabulary.SETTINGS,
                            tabBarIcon: ({ color, size }) => (
                                <Feather
                                    name="settings"
                                    color={color}
                                    size={size}
                                />
                            ),
                        }}
                    />
                </Tabs>

                <FullPlayer />

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
                        zIndex: 150,
                        pointerEvents: "box-none",
                    }}
                >
                    <Header />
                </View>
            </View>
            <ContextMenuSheet config={config} sheetRef={sheetRef} />
        </PlayerProvider>
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
