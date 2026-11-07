import { useState } from "react";
import { useDesignTheme } from "@rockit/ui";
import { Pressable, Text, View } from "react-native";
import { Http } from "@/lib/http";
import { userManager } from "@/lib/managers/userManager";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function ThemeSection() {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const [saving, setSaving] = useState(false);
    const choices = [
        { value: "dark", label: vocabulary.SETTINGS_THEME_DARK },
        { value: "light", label: vocabulary.SETTINGS_THEME_LIGHT },
        { value: "system", label: vocabulary.SETTINGS_THEME_SYSTEM },
    ] as const;
    const save = async (value: "dark" | "light" | "system") => {
        setSaving(true);
        try {
            const response = await Http.updateTheme({ theme: value });
            if (!response.isOk()) {
                toasterManager.notifyError(vocabulary.ERROR);
                return;
            }
            await userManager.updateAsync();
            toasterManager.notifySuccess(vocabulary.SETTINGS_THEME_SAVED);
        } finally {
            setSaving(false);
        }
    };
    return (
        <View style={{ gap: theme.spacing.sm }}>
            {choices.map((item) => (
                <Pressable
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityLabel={item.label}
                    accessibilityState={{
                        checked:
                            userManager.sessionAtom.get()?.theme === item.value,
                        disabled: saving,
                    }}
                    disabled={saving}
                    onPress={() => void save(item.value)}
                    style={{
                        minHeight: theme.layout.touchTarget,
                        justifyContent: "center",
                        padding: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.surface,
                    }}
                >
                    <Text style={{ color: theme.colors.foreground }}>
                        {item.label}
                    </Text>
                </Pressable>
            ))}
            {saving && (
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {vocabulary.SETTINGS_THEME_SAVING}
                </Text>
            )}
        </View>
    );
}
