import { APP_VERSION } from "@/constants/version";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { vocabularyManager } from "@/lib/managers/vocabularyManager";
import { getModalRef, useModal, type ModalContent } from "@/lib/ModalContext";
import { useVocabulary } from "@/lib/vocabulary";

interface UpdateModalContentProps {
    apkUrl: string;
    latestVersion: string;
}

export function UpdateModalContent({
    apkUrl,
    latestVersion,
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
                    <Text style={styles.versionValue}>{APP_VERSION}</Text>
                </Text>
                <Text style={styles.versionLabel}>
                    {vocabulary.MOBILE_UPDATE_NEW}{" "}
                    <Text style={[styles.versionValue, styles.accent]}>
                        {latestVersion}
                    </Text>
                </Text>
            </View>
            <Pressable
                style={styles.button}
                onPress={() => {
                    Linking.openURL(apkUrl);
                    hide();
                }}
            >
                <Text style={styles.buttonText}>
                    {vocabulary.MOBILE_UPDATE_INSTALL}
                </Text>
            </Pressable>
        </>
    );
}

export function showUpdateModal(apkUrl: string, latestVersion: string): void {
    const ref = getModalRef();
    const content: ModalContent = {
        title: vocabularyManager.vocabulary.NEW_VERSION_AVAILABLE,
        content: (
            <UpdateModalContent apkUrl={apkUrl} latestVersion={latestVersion} />
        ),
    };

    ref.show(content);
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
