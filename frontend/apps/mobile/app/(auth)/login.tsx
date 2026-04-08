import React, { useState } from "react";
import { COLORS } from "@/constants/theme";
import {
    AUTH_ENDPOINTS,
    isDevFakeMode,
    LoginRequestSchema,
    LoginResponseSchema,
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
import { apiPostAuth, BACKEND_URL, saveSessionCookie } from "@/lib/api";
import { useVocabulary } from "@/lib/vocabulary";

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fakeMode = isDevFakeMode();

    const { refreshVocabulary } = useVocabulary();

    async function handleLogin() {
        if (!username.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }

        if (fakeMode) {
            await saveSessionCookie(new Response(null, { status: 200 }));
            router.replace("/");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { response: res } = await apiPostAuth(
                AUTH_ENDPOINTS.login,
                LoginRequestSchema,
                { username, password },
                LoginResponseSchema
            );

            if (res.ok) {
                await saveSessionCookie(res);
                router.replace("/");
                refreshVocabulary();
            } else {
                setError("Login failed"); // TODO: Use vocabulary
            }
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            setError("Network error: " + errMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"} // TODO: Create EPlatform enum and replace all platform checks with it
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
                    <Text style={styles.title}>Login</Text>
                    {/* TODO: Use vocabulary */}
                    <TextInput
                        style={styles.input}
                        placeholder="Username" // TODO: Use vocabulary
                        placeholderTextColor={COLORS.gray400}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password" // TODO: Use vocabulary
                        placeholderTextColor={COLORS.gray400}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {fakeMode && (
                        <View style={styles.fakeModeBadge}>
                            <Text style={styles.fakeModeText}>DEV MODE</Text>
                        </View>
                    )}
                    {error && <Text style={styles.error}>{error}</Text>}
                    <Pressable
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled,
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text> // TODO: Use vocabulary
                        )}
                    </Pressable>
                    <Pressable
                        style={styles.linkButton}
                        onPress={() => router.push("/(auth)/register")}
                    >
                        <Text style={styles.linkText}>
                            Don&apos;t have an account? Register // TODO: Use
                            vocabulary
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
    fakeModeBadge: {
        backgroundColor: COLORS.accent,
        borderRadius: 4,
        marginBottom: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: "center",
    },
    fakeModeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: "bold",
    },
});
