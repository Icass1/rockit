import { useEffect } from "react";
import { hideSplash, initializePlatform } from "@/platform/bootstrap";
import { useDesignTheme } from "@rockit/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { VocabularyProvider } from "@/lib/vocabulary";
import { DesignProvider } from "@/components/providers/DesignProvider";
import { Toaster } from "@/components/Toaster/Toaster";

export default function RootLayout() {
    useEffect(() => {
        void initializePlatform()
            .catch((error) =>
                console.error("Platform initialization failed", error)
            )
            .finally(() => hideSplash());
    }, []);

    return (
        <SafeAreaProvider>
            <VocabularyProvider>
                <DesignProvider>
                    <RootNavigator />
                </DesignProvider>
            </VocabularyProvider>
        </SafeAreaProvider>
    );
}

function RootNavigator() {
    const theme = useDesignTheme();
    return (
        <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
            <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
            <Toaster />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background },
                }}
            >
                <Stack.Screen name="(app)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="logs" />
                <Stack.Screen name="storage" />
            </Stack>
        </GestureHandlerRootView>
    );
}
