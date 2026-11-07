import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { ScrollView, StyleSheet, View } from "react-native";

interface PageContainerProps {
    children?: React.ReactNode;
    topPadding?: number;
    bottomPadding?: number;
    horizontalPadding?: number;
}

export default function PageContainer({
    children,
    topPadding = 150,
    bottomPadding = 0,
    horizontalPadding = 16,
}: PageContainerProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: topPadding,
                        paddingBottom: bottomPadding,
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        content: {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: 0,
        },
    });
