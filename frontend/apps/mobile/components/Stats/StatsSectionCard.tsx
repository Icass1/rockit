import { ReactNode } from "react";
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
    return (
        <View style={styles.container}>
            <SectionTitle>{title}</SectionTitle>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(38,38,38,0.5)",
        backgroundColor: "rgba(26,26,26,0.6)",
        padding: 16,
    },
});
