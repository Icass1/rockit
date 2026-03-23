import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

interface SectionTitleProps {
    children: string;
}

export default function SectionTitle({ children }: SectionTitleProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{children.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    title: {
        color: COLORS.gray600,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
    },
});
