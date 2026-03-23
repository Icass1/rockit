import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

interface DownloadInputBarProps {
    onSubmit: (url: string) => Promise<unknown>;
}

export default function DownloadInputBar({ onSubmit }: DownloadInputBarProps) {
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
                placeholder="Spotify or YouTube URL…"
                placeholderTextColor={COLORS.gray600}
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
                <Feather name="download" size={20} color={COLORS.white} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.white,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPressed: {
        backgroundColor: "#d00e74",
    },
    buttonDisabled: {
        opacity: 0.4,
    },
});
