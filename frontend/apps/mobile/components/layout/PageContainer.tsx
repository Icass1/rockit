import { COLORS } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

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
            <View
                style={[
                    styles.content,
                    {
                        paddingTop: topPadding,
                        paddingHorizontal: horizontalPadding,
                    },
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 0,
    },
});
