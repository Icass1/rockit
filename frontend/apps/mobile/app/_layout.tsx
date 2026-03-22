import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
            <SafeAreaProvider>
                <StatusBar style="light" backgroundColor="#0b0b0b" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: "#0b0b0b" },
                    }}
                >
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="(auth)" />
                </Stack>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
