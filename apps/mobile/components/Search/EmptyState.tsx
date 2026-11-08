import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Search } from "@rockit/ui/icons";
import { StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function EmptyState() {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <Search size={64} color={theme.legacy.gray600} />
            <Text style={styles.title}>{vocabulary.SEARCH_EMPTY1}</Text>
            <Text style={styles.subtitle}>{vocabulary.SEARCH_EMPTY2}</Text>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.spacing.xxl,
        },
        title: {
            fontSize: 20,
            fontWeight: "bold",
            color: theme.legacy.white,
            textAlign: "center",
            marginTop: theme.spacing.lg,
        },
        subtitle: {
            fontSize: theme.typography.body,
            color: theme.legacy.gray400,
            textAlign: "center",
            marginTop: theme.spacing.sm,
        },
    });
