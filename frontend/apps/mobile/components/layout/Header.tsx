import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface HeaderProps {
    showSearch?: boolean;
}

export default function Header({ showSearch = false }: HeaderProps) {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
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
        backgroundColor: COLORS.bg,
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
});
