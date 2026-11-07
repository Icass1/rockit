import { useState } from "react";
import { validateUsername } from "@rockit/shared";
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

export default function RegisterScreen() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const { vocabulary, refreshVocabulary } = useVocabulary();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    function handleUsernameChange(value: string) {
        setUsername(value);
        if (value) {
            setUsernameError(
                validateUsername(value)
                    ? vocabulary[validateUsername(value)!]
                    : null
            );
        } else {
            setUsernameError(null);
        }
    }

    async function handleRegister() {
        if (!username.trim() || !password.trim() || !repeatPassword.trim()) {
            setError(vocabulary.ALL_FIELDS_REQUIRED);
            return;
        }

        const validationError = validateUsername(username);
        if (validationError) {
            setUsernameError(vocabulary[validationError]);
            return;
        }

        if (password !== repeatPassword) {
            setError(vocabulary.PASSWORDS_DONT_MATCH);
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const result = await Http.register({
                username,
                password,
                repeatPassword,
                platform: "MOBILE",
                rememberMe: false,
            });

            if (result.isOk()) {
                if (result.result?.sessionId) {
                    await saveSessionCookieValue(result.result.sessionId);
                }
                router.replace("/");
                refreshVocabulary();
            } else {
                setError(vocabulary.ERROR_REGISTER);
            }
        } catch {
            setError(vocabulary.ERROR);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                    <Text style={styles.title}>
                        {vocabulary.CREATE_ACCOUNT}
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            usernameError ? styles.inputError : null,
                        ]}
                        placeholder={vocabulary.USERNAME}
                        placeholderTextColor={theme.legacy.gray400}
                        value={username}
                        onChangeText={handleUsernameChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {usernameError && (
                        <Text style={styles.fieldError}>{usernameError}</Text>
                    )}

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

                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.REPEAT_PASSWORD}
                        placeholderTextColor={theme.legacy.gray400}
                        value={repeatPassword}
                        onChangeText={setRepeatPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {error && <Text style={styles.error}>{error}</Text>}

                    <Pressable
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.legacy.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {vocabulary.SIGN_UP}
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.linkButton}
                        onPress={() => router.push("/(auth)/login")}
                    >
                        <Text style={styles.linkText}>
                            {vocabulary.OR_LOG_IN}
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
        inputError: {
            borderWidth: 1,
            borderColor: theme.legacy.accent,
        },
        fieldError: {
            color: theme.legacy.accent,
            fontSize: theme.typography.caption,
            marginTop: -12,
            marginBottom: theme.spacing.lg,
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
    });
