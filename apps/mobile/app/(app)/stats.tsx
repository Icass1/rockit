import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet } from "react-native";
import StatsClient from "@/components/Stats/StatsClient";

export default function StatsScreen() {
    const styles = useThemedStyles(createStyles);
    return (
        <>
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors["background"] },
        content: {
            paddingTop: theme.layout.mobileContentTop,
            paddingBottom: theme.spacing.xxl,
            paddingHorizontal: theme.spacing.lg,
        },
    });
