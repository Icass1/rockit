import { COLORS } from "@/constants/theme";
import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.bg },
            }}
        />
    );
}
