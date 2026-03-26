import type { ReactNode } from "react";
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

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
    },
    scrollContent: {
        gap: 12,
        paddingBottom: 8,
    },
});
