import { StyleSheet, Text, View } from "react-native";
import { Header, PageContainer } from "@/components/layout";

export default function StatsScreen() {
    return (
        <>
            <Header />
            <PageContainer>
                <View style={styles.container}>
                    <Text style={styles.title}>Stats</Text>
                    <Text style={styles.comingSoon}>Coming soon</Text>
                </View>
            </PageContainer>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff",
    },
    comingSoon: {
        fontSize: 14,
        color: "#525252",
        marginTop: 8,
    },
});
