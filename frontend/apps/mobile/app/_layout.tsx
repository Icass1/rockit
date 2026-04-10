import { useEffect } from "react";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { VocabularyProvider } from "@/lib/vocabulary";
import { webSocketManager } from "@/lib/webSocketManager";

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
        SplashScreen.hideAsync();
        webSocketManager.init();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
            <SafeAreaProvider>
                <VocabularyProvider>
                    <ThemeProvider value={RockItTheme}>
                        <StatusBar style="light" />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: "#0b0b0b" },
                            }}
                        >
                            <Stack.Screen name="(app)" />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="stats" />
                        </Stack>
                    </ThemeProvider>
                </VocabularyProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
