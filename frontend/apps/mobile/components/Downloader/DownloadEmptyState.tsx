import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export default function DownloadEmptyState() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>No downloads yet</Text>
            <Text style={styles.subtext}>
                Paste a Spotify or YouTube URL to start
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 32,
        alignItems: "center",
    },
    text: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.gray600,
    },
    subtext: {
        fontSize: 12,
        color: COLORS.gray600,
        marginTop: 4,
    },
});
