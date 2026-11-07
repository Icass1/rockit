import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotificationButton from "@/components/Notifications/NotificationButton";

export const HEADER_HEIGHT = 90;

interface HeaderProps {
    showSearch?: boolean;
    showNotifications?: boolean;
}

export default function Header({ showNotifications = false }: HeaderProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient
                colors={[
                    theme.legacy.bg,
                    withAlpha(theme.colors.background, 0.9),
                    "transparent",
                ]}
                locations={[0, 0.6, 1]}
                style={styles.gradient}
            />
            <View style={styles.content}>
                <Image
                    source={require("@/assets/images/logo-banner.png")}
                    style={styles.logo}
                    contentFit="contain"
                />
                {showNotifications && <NotificationButton />}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "transparent",
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
        },
        logo: {
            width: 210,
            height: 68,
        },
        gradient: {
            ...StyleSheet.absoluteFill,
        },
    });
