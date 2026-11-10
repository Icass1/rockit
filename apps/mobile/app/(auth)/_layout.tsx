import { useDesignTheme } from "@rockit/ui";
import { Stack } from "expo-router";

export default function AuthLayout() {
    const theme = useDesignTheme();
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.legacy.bg },
            }}
        />
    );
}
