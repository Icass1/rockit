import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

// TODO: This should be a api call to get the supported languages.
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
    const { vocabulary, lang, setLanguage, isLoading } = useVocabulary();
    const [isSaving, setIsSaving] = useState(false);

    async function handleChange(newLang: string) {
        setIsSaving(true);
        try {
            await setLanguage(newLang);
        } catch {
            Alert.alert(vocabulary.ERROR, vocabulary.FAILED_TO_CHANGE_LANGUAGE);
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
                        vocabulary.LANGUAGE,
                        undefined,
                        LANGUAGES.map((l) => ({
                            text: l.label,
                            onPress: () => handleChange(l.value),
                        })),
                        { cancelable: true }
                    );
                }}
            >
                <Text style={styles.label}>{vocabulary.LANGUAGE}</Text>
                <View style={styles.valueRow}>
                    <Text style={styles.value}>{selectedLabel}</Text>
                    {(isSaving || isLoading) && (
                        <Text style={styles.saving}>{vocabulary.SAVING}</Text>
                    )}
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
