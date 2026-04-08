import React, { useState } from "react";
import { COLORS } from "@/constants/theme";
import {
    AUTH_ENDPOINTS,
    RegisterRequestSchema,
    RegisterResponseSchema,
} from "@rockit/shared";
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
import { apiPostAuth, saveSessionCookie } from "@/lib/api";

function validateUsername(value: string): string | null {
    if (value === "") return null;
    if (value.length < 3 || value.length > 30)
        return "Username must be between 3 and 30 characters"; // TODO: Use vocabulary
    if (!/^[a-zA-Z0-9_-]+$/.test(value))
        return "Only letters, numbers, _ and - are allowed"; // TODO: Use vocabulary
    return null;
}

export default function RegisterScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    function handleUsernameChange(value: string) {
        setUsername(value);
        if (value) {
            setUsernameError(validateUsername(value));
        } else {
            setUsernameError(null);
        }
    }

    async function handleRegister() {
        if (!username.trim() || !password.trim() || !repeatPassword.trim()) {
            setError("Please fill in all fields");
            return;
        }

        const validationError = validateUsername(username);
        if (validationError) {
            setUsernameError(validationError);
            return;
        }

        if (password !== repeatPassword) {
            setError("Passwords do not match");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { response: res } = await apiPostAuth(
                AUTH_ENDPOINTS.register,
                RegisterRequestSchema,
                { username, password, repeatPassword, platform: "MOBILE" },
                RegisterResponseSchema
            );

            if (res.ok) {
                await saveSessionCookie(res);
                router.replace("/");
            } else {
                setError("Registration failed");
            }
        } catch {
            setError("Network error");
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
                    <Text style={styles.title}>Register</Text>

                    <TextInput
                        style={[
                            styles.input,
                            usernameError ? styles.inputError : null,
                        ]}
                        placeholder="Username"
                        placeholderTextColor={COLORS.gray400}
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
                        placeholder="Password"
                        placeholderTextColor={COLORS.gray400}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Repeat Password"
                        placeholderTextColor={COLORS.gray400}
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
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                Create Account
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.linkButton}
                        onPress={() => router.push("/(auth)/login")}
                    >
                        <Text style={styles.linkText}>
                            Already have an account? Login
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 250,
        height: 80,
    },
    form: {
        width: "100%",
    },
    title: {
        color: COLORS.white,
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        backgroundColor: "#202020",
        borderRadius: 999,
        color: COLORS.white,
        fontSize: 16,
        height: 44,
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    inputError: {
        borderWidth: 1,
        borderColor: COLORS.accent,
    },
    fieldError: {
        color: COLORS.accent,
        fontSize: 12,
        marginTop: -12,
        marginBottom: 16,
    },
    error: {
        color: COLORS.accentLight,
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    button: {
        backgroundColor: COLORS.accent,
        borderRadius: 999,
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
    linkButton: {
        marginTop: 20,
        alignItems: "center",
    },
    linkText: {
        color: COLORS.accent,
        fontSize: 14,
    },
});
