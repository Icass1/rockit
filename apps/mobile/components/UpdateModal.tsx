import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useModal } from "@/lib/ModalContext";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

interface UpdateModalContentProps {
    apkUrl: string;
    currentBuild: number;
    latestBuild: number;
}

export function UpdateModalContent({
    apkUrl,
    currentBuild,
    latestBuild,
}: UpdateModalContentProps) {
    const { vocabulary } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const { hide } = useModal();

    return (
        <>
            <Text style={styles.body}>
                {vocabulary.MOBILE_UPDATE_AVAILABLE}
            </Text>
            <View style={styles.versions}>
                <Text style={styles.versionLabel}>
                    {vocabulary.MOBILE_UPDATE_CURRENT}{" "}
                    <Text style={styles.versionValue}>#{currentBuild}</Text>
                </Text>
                <Text style={styles.versionLabel}>
                    {vocabulary.MOBILE_UPDATE_NEW}{" "}
                    <Text style={[styles.versionValue, styles.accent]}>
                        #{latestBuild}
                    </Text>
                </Text>
            </View>
            <Pressable
                style={styles.button}
                onPress={() => {
                    void Linking.openURL(apkUrl)
                        .then(hide)
                        .catch(() => {
                            toasterManager.notifyError(
                                vocabulary.ADMIN_ANDROID_DOWNLOAD_FAILED
                            );
                        });
                }}
            >
                <Text style={styles.buttonText}>
                    {vocabulary.ANDROID_RELEASE_UPDATE}
                </Text>
            </Pressable>
            <Text style={styles.body}>
                {vocabulary.ANDROID_RELEASE_INSTALL_HINT}
            </Text>
        </>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        body: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
            lineHeight: 20,
        },
        versions: {
            gap: theme.spacing.xs,
        },
        versionLabel: {
            color: theme.legacy.gray400,
            fontSize: 13,
        },
        versionValue: {
            color: theme.legacy.white,
            fontWeight: "600",
        },
        accent: {
            color: theme.legacy.accent,
        },
        button: {
            backgroundColor: theme.legacy.accent,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: theme.spacing.xs,
        },
        buttonText: {
            color: theme.legacy.white,
            fontSize: 15,
            fontWeight: "700",
        },
    });
