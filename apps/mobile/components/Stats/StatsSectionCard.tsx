import { ReactNode } from "react";
import { withAlpha } from "@rockit/theme";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, View } from "react-native";
import SectionTitle from "@/components/layout/SectionTitle";

interface StatsSectionCardProps {
    title: string;
    children: ReactNode;
}

export default function StatsSectionCard({
    title,
    children,
}: StatsSectionCardProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            {children}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: withAlpha(theme.colors["surface-raised"], 0.5),
            backgroundColor: withAlpha(theme.colors["secondary"], 0.6),
            padding: theme.spacing.lg,
        },
    });
