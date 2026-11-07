import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";

interface SectionTitleProps {
    children: string;
}

export default function SectionTitle({ children }: SectionTitleProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{children.toUpperCase()}</Text>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            marginVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
        },
        title: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.caption,
            fontWeight: "700",
            letterSpacing: 1.5,
        },
    });
