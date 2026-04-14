import { COLORS } from "@/constants/theme";
import { ScrollView, StyleSheet, View } from "react-native";

interface PageContainerProps {
    children?: React.ReactNode;
    topPadding?: number;
    horizontalPadding?: number;
}

export default function PageContainer({
    children,
    topPadding = 150,
    horizontalPadding = 16,
}: PageContainerProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: topPadding,
                        paddingHorizontal: horizontalPadding,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 0,
    },
});
