import { useState } from "react";
import { useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Pressable, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function LanguageSection() {
    const theme = useDesignTheme();
    const { vocabulary, lang, setLanguage } = useVocabulary();
    const [saving, setSaving] = useState(false);
    const resource = useAsyncResource(async () => {
        const response = await Http.getAllLanguages();
        if (!response.isOk()) throw new Error(response.message);
        return response.result.languages;
    });
    const change = async (code: string) => {
        setSaving(true);
        try {
            await setLanguage(code);
        } catch {
            toasterManager.notifyError(vocabulary.LANGUAGE_CHANGE_FAILED);
        } finally {
            setSaving(false);
        }
    };
    return (
        <View style={{ gap: theme.spacing.sm }}>
            {resource.error && (
                <Pressable
                    onPress={() => void resource.refresh()}
                    accessibilityRole="button"
                >
                    <Text style={{ color: theme.colors.destructive }}>
                        {vocabulary.RETRY}
                    </Text>
                </Pressable>
            )}
            {resource.data?.map((item) => (
                <Pressable
                    key={item.langCode}
                    accessibilityRole="radio"
                    accessibilityState={{
                        checked: item.langCode === lang,
                        disabled: saving,
                    }}
                    accessibilityLabel={item.language}
                    disabled={saving}
                    onPress={() => void change(item.langCode)}
                    style={{
                        minHeight: theme.layout.touchTarget,
                        justifyContent: "center",
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor:
                            item.langCode === lang
                                ? theme.colors.accent
                                : theme.colors.surface,
                    }}
                >
                    <Text style={{ color: theme.colors.foreground }}>
                        {item.language}
                    </Text>
                </Pressable>
            ))}
            {(resource.loading || saving) && (
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {vocabulary.MOBILE_LOADING}
                </Text>
            )}
        </View>
    );
}
