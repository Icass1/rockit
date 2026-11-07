import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

export default function DownloadEmptyState() {
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{vocabulary.NO_DOWNLOADS}</Text>
            <Text style={styles.subtext}>
                {vocabulary.MOBILE_DOWNLOAD_HINT}
            </Text>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingVertical: theme.spacing.xxl,
            alignItems: "center",
        },
        text: {
            fontSize: theme.typography.body,
            fontWeight: "500",
            color: theme.legacy.gray600,
        },
        subtext: {
            fontSize: theme.typography.caption,
            color: theme.legacy.gray600,
            marginTop: theme.spacing.xs,
        },
    });
