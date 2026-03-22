import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Header from "@/components/layout/Header";

export default function DownloaderScreen() {
    return (
        <>
            <Header />
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.text}>Downloads coming soon</Text>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { flex: 1, alignItems: "center", justifyContent: "center" },
    text: { color: COLORS.gray400, fontSize: 16 },
});
