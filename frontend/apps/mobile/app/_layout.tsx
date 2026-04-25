import { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "@/lib/database/db";
import { PlayerProvider } from "@/lib/PlayerContext";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { syncManager } from "@/lib/syncManager";
import { VocabularyProvider } from "@/lib/vocabulary";
import { webSocketManager } from "@/lib/webSocketManager";
import { Toaster } from "@/components/Toaster/Toaster";

SplashScreen.preventAutoHideAsync();

const RockItTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: "#0b0b0b",
        card: "#0b0b0b",
    },
};

export default function RootLayout() {
    useEffect(() => {
        async function init() {
            try {
                await initDatabase();
                await mediaStorage.init();
                await syncManager.init();
                await webSocketManager.init();
            } catch (e) {
                console.error("Initialization error:", e);
            } finally {
                SplashScreen.hideAsync();
            }
        }
        init();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
            <SafeAreaProvider>
                <VocabularyProvider>
                    <ThemeProvider value={RockItTheme}>
                        <StatusBar style="light" />
                        <PlayerProvider>
                            <Toaster />
                            <Stack
                                screenOptions={{
                                    headerShown: false,
                                    contentStyle: {
                                        backgroundColor: "#0b0b0b",
                                    },
                                }}
                            >
                                <Stack.Screen name="(app)" />
                                <Stack.Screen name="(auth)" />
                                <Stack.Screen name="stats" />
                            </Stack>
                        </PlayerProvider>
                    </ThemeProvider>
                </VocabularyProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
