import { ScrollView, StyleSheet } from "react-native";
import { Header } from "@/components/layout";
import StatsClient from "@/components/Stats/StatsClient";

export default function StatsScreen() {
    return (
        <>
            <Header />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <StatsClient />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0b0b0b" },
    content: { paddingTop: 120, paddingBottom: 32, paddingHorizontal: 16 },
});
