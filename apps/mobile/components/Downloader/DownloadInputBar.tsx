import { useState } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { Download } from "@rockit/ui/icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

interface DownloadInputBarProps {
    onSubmit: (url: string) => Promise<unknown>;
}

export default function DownloadInputBar({ onSubmit }: DownloadInputBarProps) {
    const { vocabulary } = useVocabulary();
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const [url, setUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = url.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(trimmed);
            setUrl("");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder={vocabulary.MOBILE_DOWNLOAD_URL}
                placeholderTextColor={theme.legacy.gray600}
                value={url}
                onChangeText={setUrl}
                onSubmitEditing={handleSubmit}
                editable={!submitting}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="send"
            />
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                    (!url.trim() || submitting) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!url.trim() || submitting}
            >
                <Download size={20} color={theme.legacy.white} />
            </Pressable>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
        },
        input: {
            flex: 1,
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: 24,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
            fontSize: theme.typography.body,
            color: theme.legacy.white,
        },
        button: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.legacy.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonPressed: {
            backgroundColor: theme.colors["primary-hover"],
        },
        buttonDisabled: {
            opacity: 0.4,
        },
    });
