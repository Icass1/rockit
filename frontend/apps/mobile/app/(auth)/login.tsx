import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { EPlatform } from "@rockit/shared";
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
import { Http } from "@/lib/http";
import { saveSessionCookieValue } from "@/lib/api";
import { useVocabulary } from "@/lib/vocabulary";

export default function LoginScreen() {
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
                platform: "MOBILE",
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
                        placeholderTextColor={COLORS.gray400}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.PASSWORD}
                        placeholderTextColor={COLORS.gray400}
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
                            <ActivityIndicator color={COLORS.white} />
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
    rememberMeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        gap: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.gray400,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxChecked: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "bold",
    },
    rememberMeText: {
        color: COLORS.gray400,
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
