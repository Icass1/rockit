import { COLORS } from "@/constants/theme";
import { APP_VERSION } from "@/constants/version";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getModalRef, useModal, type ModalContent } from "@/lib/ModalContext";

interface UpdateModalContentProps {
    apkUrl: string;
    latestVersion: string;
}

export function UpdateModalContent({
    apkUrl,
    latestVersion,
}: UpdateModalContentProps) {
    const { hide } = useModal();

    return (
        <>
            <Text style={styles.body}>
                A new version of RockIt! is available.
            </Text>
            <View style={styles.versions}>
                <Text style={styles.versionLabel}>
                    Current:{" "}
                    <Text style={styles.versionValue}>{APP_VERSION}</Text>
                </Text>
                <Text style={styles.versionLabel}>
                    New:{" "}
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
                <Text style={styles.buttonText}>Download &amp; Install</Text>
            </Pressable>
        </>
    );
}

export function showUpdateModal(apkUrl: string, latestVersion: string): void {
    console.log("showUpdateModal");

    const ref = getModalRef();
    const content: ModalContent = {
        title: "Update Available",
        content: (
            <UpdateModalContent apkUrl={apkUrl} latestVersion={latestVersion} />
        ),
    };
    console.log("ref.show", ref);

    ref.show(content);
}

const styles = StyleSheet.create({
    body: {
        color: COLORS.gray400,
        fontSize: 14,
        lineHeight: 20,
    },
    versions: {
        gap: 4,
    },
    versionLabel: {
        color: COLORS.gray400,
        fontSize: 13,
    },
    versionValue: {
        color: COLORS.white,
        fontWeight: "600",
    },
    accent: {
        color: COLORS.accent,
    },
    button: {
        backgroundColor: COLORS.accent,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
    },
});
