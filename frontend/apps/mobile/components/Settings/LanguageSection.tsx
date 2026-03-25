import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "eu", label: "Euskera" },
    { value: "fr", label: "Français" },
    { value: "it", label: "Italiano" },
    { value: "de", label: "Deutsch" },
    { value: "zh", label: "中文" },
    { value: "ja", label: "日本語" },
    { value: "ar", label: "عربي" },
];

export default function LanguageSection() {
    const [lang, setLang] = useState("en");
    const [isSaving, setIsSaving] = useState(false);

    async function handleChange(newLang: string) {
        setLang(newLang);
        setIsSaving(true);
        try {
            const res = await fetch(
                `${process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/user/lang`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lang: newLang }),
                }
            );
            if (!res.ok) throw new Error("Failed");
        } catch {
            Alert.alert("Error", "Failed to save language");
        } finally {
            setIsSaving(false);
        }
    }

    const selectedLabel =
        LANGUAGES.find((l) => l.value === lang)?.label ?? "English";

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.selector,
                    pressed && styles.selectorPressed,
                ]}
                onPress={() => {
                    Alert.alert(
                        "Select Language",
                        undefined,
                        LANGUAGES.map((l) => ({
                            text: l.label,
                            onPress: () => handleChange(l.value),
                        })),
                        { cancelable: true }
                    );
                }}
            >
                <Text style={styles.label}>Language</Text>
                <View style={styles.valueRow}>
                    <Text style={styles.value}>{selectedLabel}</Text>
                    {isSaving && <Text style={styles.saving}>Saving...</Text>}
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
    },
    selector: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.gray800,
    },
    selectorPressed: {
        opacity: 0.7,
    },
    label: {
        color: COLORS.white,
        fontSize: 16,
    },
    valueRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    value: {
        color: COLORS.gray400,
        fontSize: 16,
    },
    saving: {
        color: COLORS.accent,
        fontSize: 12,
    },
});
