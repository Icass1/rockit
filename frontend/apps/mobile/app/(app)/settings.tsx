import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.content}>
                <Text style={styles.text}>Settings — coming soon</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { flex: 1, alignItems: "center", justifyContent: "center" },
    text: { color: COLORS.white, fontSize: 16 },
});
