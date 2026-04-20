import { COLORS } from "@/constants/theme";
import { APP_VERSION } from "@/constants/version";
import {
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

interface UpdateModalProps {
    visible: boolean;
    apkUrl: string | null;
    latestVersion: string | null;
}

export default function UpdateModal({
    visible,
    apkUrl,
    latestVersion,
}: UpdateModalProps) {
    const handleDownload = () => {
        if (apkUrl) {
            Linking.openURL(apkUrl);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.body}>
                        A new version of RockIt! is available.
                    </Text>
                    <View style={styles.versions}>
                        <Text style={styles.versionLabel}>
                            Current:{" "}
                            <Text style={styles.versionValue}>
                                {APP_VERSION}
                            </Text>
                        </Text>
                        <Text style={styles.versionLabel}>
                            New:{" "}
                            <Text style={[styles.versionValue, styles.accent]}>
                                {latestVersion}
                            </Text>
                        </Text>
                    </View>
                    <Pressable style={styles.button} onPress={handleDownload}>
                        <Text style={styles.buttonText}>
                            Download &amp; Install
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 360,
        gap: 12,
    },
    title: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
    },
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
