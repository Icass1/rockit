import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface HeaderProps {
    showSearch?: boolean;
}

export default function Header({ showSearch = false }: HeaderProps) {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LinearGradient
                colors={[COLORS.bg, "rgba(0, 0, 0)", "transparent"]}
                locations={[0, 0.6, 1]}
                style={styles.gradient}
            />
            <View style={styles.content}>
                <Image
                    source={require("@/assets/images/logo-banner.png")}
                    style={styles.logo}
                    contentFit="contain"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "transparent",
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: "center",
    },
    logo: {
        width: 210,
        height: 68,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
});
