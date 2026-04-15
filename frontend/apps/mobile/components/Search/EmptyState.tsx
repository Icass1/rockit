import { COLORS } from "@/constants/theme";
import { Search } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function EmptyState() {
    return (
        <View style={styles.container}>
            <Search size={64} color={COLORS.gray600} />
            <Text style={styles.title}>Silence is deafening</Text>
            <Text style={styles.subtitle}>
                Find songs, albums, artists, playlists and more
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.white,
        textAlign: "center",
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.gray400,
        textAlign: "center",
        marginTop: 8,
    },
});
