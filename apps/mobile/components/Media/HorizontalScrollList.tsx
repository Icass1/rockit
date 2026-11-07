import type { ReactNode } from "react";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet, View } from "react-native";
import SectionTitle from "@/components/layout/SectionTitle";

interface HorizontalScrollListProps {
    title: string;
    children: ReactNode;
    contentPaddingHorizontal?: number;
}

export default function HorizontalScrollList({
    title,
    children,
    contentPaddingHorizontal = 16,
}: HorizontalScrollListProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingHorizontal: contentPaddingHorizontal },
                ]}
            >
                {children}
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.lg,
        },
        scrollContent: {
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
        },
    });
