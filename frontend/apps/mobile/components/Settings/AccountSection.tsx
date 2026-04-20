import { useState } from "react";
import { COLORS } from "@/constants/theme";
import { HttpResult, UpdatePasswordRequestSchema } from "@rockit/shared";
import type { TZodSchema } from "@rockit/shared";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useSettingsUser } from "@/hooks/useSettingsUser";
import { apiFetch } from "@/lib/api";
import { useVocabulary } from "@/lib/vocabulary";
import SettingRow from "./SettingRow";

async function apiPatchNoResponse<T>(
    path: string,
    schema: TZodSchema<T>,
    body: T
): Promise<HttpResult<unknown>> {
    return apiFetch(path, schema, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}

export default function AccountSection() {
    const { username, isLoading } = useSettingsUser();
    const { vocabulary } = useVocabulary();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handlePasswordChange() {
        if (newPassword !== repeatPassword) {
            Alert.alert(vocabulary.ERROR, "Passwords don't match");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert(
                vocabulary.ERROR,
                "Password must be at least 6 characters"
            );
            return;
        }
        setIsSaving(true);
        try {
            await apiPatchNoResponse(
                "/user/password",
                UpdatePasswordRequestSchema,
                { password: newPassword }
            );
            Alert.alert("Success", "Password updated");
            setNewPassword("");
            setRepeatPassword("");
            setShowPasswordForm(false);
        } catch {
            Alert.alert(vocabulary.ERROR, "Failed to update password");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <View style={styles.container}>
            <SettingRow
                label={vocabulary.USER}
                value={
                    <Text style={styles.value}>
                        {isLoading ? "..." : username || "—"}
                    </Text>
                }
                isLast={!showPasswordForm}
            />
            {showPasswordForm ? (
                <View style={styles.passwordForm}>
                    <Text style={styles.hint}>
                        Leave blank to keep current password
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.NEW_PASSWORD}
                        placeholderTextColor={COLORS.gray600}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.REPEAT_PASSWORD}
                        placeholderTextColor={COLORS.gray600}
                        secureTextEntry
                        value={repeatPassword}
                        onChangeText={setRepeatPassword}
                    />
                    <View style={styles.buttonRow}>
                        <Text
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowPasswordForm(false);
                                setNewPassword("");
                                setRepeatPassword("");
                            }}
                        >
                            {vocabulary.CANCEL}
                        </Text>
                        <Text
                            style={[
                                styles.saveButton,
                                isSaving && styles.saveButtonDisabled,
                            ]}
                            onPress={
                                isSaving ? undefined : handlePasswordChange
                            }
                        >
                            {isSaving ? vocabulary.SAVING : "Save"}
                        </Text>
                    </View>
                </View>
            ) : (
                <Text
                    style={styles.changePassword}
                    onPress={() => setShowPasswordForm(true)}
                >
                    {vocabulary.CHANGE_PASSWORD}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
    },
    value: {
        color: COLORS.gray400,
        fontSize: 16,
    },
    changePassword: {
        color: COLORS.accent,
        fontSize: 14,
        paddingVertical: 12,
    },
    passwordForm: {
        paddingTop: 16,
        gap: 12,
    },
    hint: {
        color: COLORS.gray600,
        fontSize: 12,
        marginBottom: 4,
    },
    input: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.gray800,
        color: COLORS.white,
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 16,
        marginTop: 8,
    },
    cancelButton: {
        color: COLORS.gray400,
        fontSize: 16,
        paddingVertical: 8,
    },
    saveButton: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: "600",
        paddingVertical: 8,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
});
