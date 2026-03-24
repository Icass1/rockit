import { COLORS } from "@/constants/theme";
import { ScrollView, StyleSheet } from "react-native";

interface PageContainerProps {
    children: React.ReactNode;
    topPadding?: number;
}

export default function PageContainer({
    children,
    topPadding = 120,
}: PageContainerProps) {
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
});
