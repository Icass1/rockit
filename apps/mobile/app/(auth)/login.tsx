import { useState } from "react";
import { capabilities } from "@/platform/capabilities";
import { EPlatform } from "@rockit/shared";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { saveSessionCookieValue } from "@/lib/api";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";

export default function LoginScreen() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { vocabulary, refreshVocabulary } = useVocabulary();

    async function handleLogin() {
        if (!username.trim() || !password.trim()) {
            setError(vocabulary.ALL_FIELDS_REQUIRED);
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const result = await Http.login({
                username,
                password,
                platform: capabilities.sessionPlatform,
                rememberMe,
            });

            if (result.isOk()) {
                if (result.result?.sessionId) {
                    await saveSessionCookieValue(result.result.sessionId);
                }
                router.replace("/");
                refreshVocabulary();
            } else {
                setError(vocabulary.ERROR_LOGIN);
            }
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            setError(`${vocabulary.ERROR}: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === EPlatform.iOS ? "padding" : "height"} // TODO: Create EPlatform enum and replace all platform checks with it
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoContainer}>
                    <Image
                        source={require("@/assets/images/logo-banner.png")}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </View>

                <View style={styles.form}>
                    <Text style={styles.title}>{vocabulary.LOG_IN}</Text>

                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.USERNAME}
                        placeholderTextColor={theme.legacy.gray400}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.PASSWORD}
                        placeholderTextColor={theme.legacy.gray400}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {error && <Text style={styles.error}>{error}</Text>}
                    <Pressable
                        style={styles.rememberMeRow}
                        onPress={() => setRememberMe(!rememberMe)}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                rememberMe && styles.checkboxChecked,
                            ]}
                        >
                            {rememberMe && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </View>
                        <Text style={styles.rememberMeText}>
                            {vocabulary.REMEMBER_ME}
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.legacy.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {vocabulary.LOG_IN}
                            </Text>
                        )}
                    </Pressable>
                    <Pressable
                        style={styles.linkButton}
                        onPress={() => router.push("/(auth)/register")}
                    >
                        <Text style={styles.linkText}>
                            {vocabulary.OR_CREATE_ACCOUNT}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.legacy.bg,
        },
        scrollContent: {
            flexGrow: 1,
            justifyContent: "center",
            padding: theme.spacing.xl,
        },
        logoContainer: {
            alignItems: "center",
            marginBottom: theme.spacing.page,
        },
        logo: {
            width: 250,
            height: 80,
        },
        form: {
            width: "100%",
        },
        title: {
            color: theme.legacy.white,
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: theme.spacing.xl,
            textAlign: "center",
        },
        input: {
            backgroundColor: theme.colors["muted"],
            borderRadius: theme.radius.full,
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            height: 44,
            marginBottom: theme.spacing.lg,
            paddingHorizontal: 20,
        },
        error: {
            color: theme.legacy.accentLight,
            fontSize: theme.typography.body,
            marginBottom: theme.spacing.lg,
            textAlign: "center",
        },
        button: {
            backgroundColor: theme.legacy.accent,
            borderRadius: theme.radius.full,
            height: 44,
            justifyContent: "center",
            alignItems: "center",
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        buttonText: {
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            fontWeight: "600",
        },
        linkButton: {
            marginTop: 20,
            alignItems: "center",
        },
        linkText: {
            color: theme.legacy.accent,
            fontSize: theme.typography.body,
        },
        rememberMeRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: theme.spacing.lg,
            gap: theme.spacing.sm,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: theme.radius.sm,
            borderWidth: 2,
            borderColor: theme.legacy.gray400,
            alignItems: "center",
            justifyContent: "center",
        },
        checkboxChecked: {
            backgroundColor: theme.legacy.accent,
            borderColor: theme.legacy.accent,
        },
        checkmark: {
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            fontWeight: "bold",
        },
        rememberMeText: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
        },
        fakeModeBadge: {
            backgroundColor: theme.legacy.accent,
            borderRadius: theme.radius.sm,
            marginBottom: theme.spacing.lg,
            paddingVertical: 6,
            paddingHorizontal: theme.spacing.md,
            alignSelf: "center",
        },
        fakeModeText: {
            color: theme.legacy.white,
            fontSize: theme.typography.caption,
            fontWeight: "bold",
        },
    });
