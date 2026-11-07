import { useState } from "react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useSettingsUser } from "@/hooks/useSettingsUser";
import { Http } from "@/lib/http";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import SettingRow from "@/components/Settings/SettingRow";

export default function AccountSection() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { username, isLoading } = useSettingsUser();
    const { vocabulary } = useVocabulary();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function handlePasswordChange() {
        if (newPassword !== repeatPassword) {
            toasterManager.notifyError(vocabulary.PASSWORDS_DONT_MATCH);
            return;
        }
        if (newPassword.length < 6) {
            toasterManager.notifyError(vocabulary.MOBILE_PASSWORD_LENGTH);
            return;
        }
        setIsSaving(true);
        const response = await Http.updatePassword({ password: newPassword });

        if (response.isOk()) {
            toasterManager.notifySuccess(vocabulary.MOBILE_PASSWORD_UPDATED);
            setNewPassword("");
            setRepeatPassword("");
            setShowPasswordForm(false);
        } else {
            toasterManager.notifyError(vocabulary.MOBILE_PASSWORD_ERROR);
        }
        setIsSaving(false);
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
                        {vocabulary.MOBILE_PASSWORD_HINT}
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.NEW_PASSWORD}
                        placeholderTextColor={theme.legacy.gray600}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={vocabulary.REPEAT_PASSWORD}
                        placeholderTextColor={theme.legacy.gray600}
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
                            {isSaving ? vocabulary.SAVING : vocabulary.SAVE}
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: { gap: theme.spacing.lg },
        value: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.label,
        },
        changePassword: {
            color: theme.legacy.accent,
            fontSize: theme.typography.body,
        },
        passwordForm: {
            paddingTop: theme.spacing.lg,
            gap: theme.spacing.md,
        },
        hint: {
            color: theme.legacy.gray600,
            fontSize: theme.typography.caption,
            marginBottom: theme.spacing.xs,
        },
        input: {
            backgroundColor: theme.legacy.bgCard,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.legacy.gray800,
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
        },
        buttonRow: {
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: theme.spacing.lg,
            marginTop: theme.spacing.sm,
        },
        cancelButton: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.label,
            paddingVertical: theme.spacing.sm,
        },
        saveButton: {
            color: theme.legacy.accent,
            fontSize: theme.typography.label,
            fontWeight: "600",
            paddingVertical: theme.spacing.sm,
        },
        saveButtonDisabled: {
            opacity: 0.5,
        },
    });
