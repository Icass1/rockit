import { installedAndroidApkCode } from "@/constants/androidApk";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function AndroidReleaseSection() {
    const { vocabulary: v } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const release = useAsyncResource(async () => {
        const response = await Http.getLatestAndroidRelease();
        if (!response.isOk()) throw new Error(response.message);
        return response.result.apk;
    }, "main-android-release");
    const installed = installedAndroidApkCode;
    const apk = release.data;
    const updateAvailable =
        installed !== null &&
        apk?.versionCode != null &&
        apk.versionCode > installed;
    const current =
        installed !== null && apk?.versionCode != null && !updateAvailable;
    return (
        <View style={styles.content}>
            {installed !== null && (
                <Text style={styles.description}>
                    {v.ANDROID_RELEASE_INSTALLED.replace(
                        "{build}",
                        String(installed - 1)
                    )}
                </Text>
            )}
            <View accessibilityLiveRegion="polite">
                {release.loading ? (
                    <Text style={styles.description}>
                        {v.ANDROID_RELEASE_CHECKING}
                    </Text>
                ) : !apk ? (
                    <Text style={styles.description}>
                        {v.ANDROID_RELEASE_UNAVAILABLE}
                    </Text>
                ) : current ? (
                    <Text style={styles.description}>
                        {v.ANDROID_RELEASE_CURRENT}
                    </Text>
                ) : null}
            </View>
            {apk &&
                !release.loading &&
                (installed === null || updateAvailable) && (
                    <Pressable
                        accessibilityRole="button"
                        style={styles.primary}
                        onPress={() => {
                            void Linking.openURL(apk.apkUrl).catch(() => {
                                toasterManager.notifyError(
                                    v.ADMIN_ANDROID_DOWNLOAD_FAILED
                                );
                            });
                        }}
                    >
                        <Text style={styles.primaryText}>
                            {updateAvailable
                                ? v.ANDROID_RELEASE_UPDATE
                                : v.ANDROID_RELEASE_DOWNLOAD.replace(
                                      "{build}",
                                      String(apk.buildNumber)
                                  )}
                        </Text>
                    </Pressable>
                )}
            {updateAvailable && !release.loading && (
                <Text style={styles.description}>
                    {v.ANDROID_RELEASE_INSTALL_HINT}
                </Text>
            )}
            {(installed !== null || release.error) && (
                <Pressable
                    accessibilityRole="button"
                    disabled={release.loading}
                    style={styles.secondary}
                    onPress={() => void release.refresh()}
                >
                    <Text style={styles.secondaryText}>
                        {installed !== null ? v.ANDROID_RELEASE_CHECK : v.RETRY}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        content: { gap: theme.spacing.sm },
        description: {
            color: theme.colors["muted-foreground"],
            fontSize: theme.typography.label,
        },
        primary: {
            backgroundColor: theme.colors.primary,
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: theme.radius.lg,
            padding: theme.spacing.sm,
        },
        primaryText: {
            color: theme.colors["primary-foreground"],
            fontWeight: "600",
        },
        secondary: {
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
        },
        secondaryText: { color: theme.colors.primary, fontWeight: "600" },
    });
