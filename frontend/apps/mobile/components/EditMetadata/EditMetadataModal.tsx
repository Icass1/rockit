import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { COLORS } from "@/constants/theme";
import { useVocabulary } from "@/lib/vocabulary";
import { Http } from "@/lib/http";
import {
    getMediaSubtitle,
    type TMedia as MobileMedia,
    type BaseSearchResultsItem,
} from "@rockit/shared";

type MediaForEdit = MobileMedia | BaseSearchResultsItem;

interface FieldDef {
    key: string;
    label: string;
    value: string;
    multiline: boolean;
}

function getFieldsForMedia(media: MediaForEdit): FieldDef[] {
    switch (media.type) {
        case "song":
            return [
                {
                    key: "title",
                    label: "Title",
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    multiline: false,
                },
                {
                    key: "album",
                    label: "Album",
                    value: "album" in media && media.album
                        ? media.album.name
                        : "",
                    multiline: false,
                },
                { key: "genre", label: "Genre", value: "", multiline: false },
                { key: "lyrics", label: "Lyrics", value: "", multiline: true },
            ];
        case "video":
            return [
                {
                    key: "title",
                    label: "Title",
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    multiline: false,
                },
                { key: "genre", label: "Genre", value: "", multiline: false },
            ];
        case "album":
            return [
                {
                    key: "title",
                    label: "Name",
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    multiline: false,
                },
                {
                    key: "releaseDate",
                    label: "Release date",
                    value: "releaseDate" in media && media.releaseDate
                        ? media.releaseDate
                        : "",
                    multiline: false,
                },
                { key: "genre", label: "Genre", value: "", multiline: false },
            ];
        case "artist":
            return [
                {
                    key: "title",
                    label: "Name",
                    value: media.name,
                    multiline: false,
                },
                { key: "genre", label: "Genre", value: "", multiline: false },
            ];
        default:
            return [];
    }
}

interface EditMetadataModalContentProps {
    media: MediaForEdit;
    onClose: () => void;
}

export function EditMetadataModalContent({
    media,
    onClose,
}: EditMetadataModalContentProps) {
    const { vocabulary } = useVocabulary();
    const [fields, setFields] = useState<FieldDef[]>(() =>
        getFieldsForMedia(media)
    );
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFieldChange = (key: string, value: string): void => {
        setFields((prev) =>
            prev.map((f) => (f.key === key ? { ...f, value } : f))
        );
    };

    const handleSubmit = async (): Promise<void> => {
        setSubmitting(true);
        setError(null);

        const changes: Record<string, string> = {};
        for (const f of fields) {
            if (f.value.trim()) {
                changes[f.key] = f.value.trim();
            }
        }

        const mediaPublicId =
            "publicId" in media ? media.publicId : null;

        const result = await Http.createRequest({
            mediaPublicId,
            requestType: "metadata",
            proposedValue: JSON.stringify(changes),
            comment: comment.trim() || null,
        });

        if (result.isOk()) {
            setSubmitted(true);
        } else {
            setError(
                typeof result.detail === "string"
                    ? result.detail
                    : vocabulary.EDIT_METADATA_ERROR || "Failed to submit"
            );
        }

        setSubmitting(false);
    };

    if (submitted) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.successTitle}>
                    {vocabulary.EDIT_METADATA_SUCCESS || "Suggestion submitted!"}
                </Text>
                <Text style={styles.successSubtitle}>
                    An admin will review your changes.
                </Text>
                <Pressable style={styles.primaryButton} onPress={onClose}>
                    <Text style={styles.primaryButtonText}>Close</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Media info */}
            <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={1}>
                    {media.name}
                </Text>
                <Text style={styles.mediaSubtitle} numberOfLines={1}>
                    {getMediaSubtitle(media)}
                </Text>
            </View>

            {/* Fields */}
            {fields.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                        style={[
                            styles.input,
                            field.multiline && styles.inputMultiline,
                        ]}
                        value={field.value}
                        onChangeText={(v) => handleFieldChange(field.key, v)}
                        placeholderTextColor={COLORS.gray600}
                        multiline={field.multiline}
                        numberOfLines={field.multiline ? 4 : 1}
                        textAlignVertical={field.multiline ? "top" : "center"}
                    />
                </View>
            ))}

            {/* Comment */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                    {vocabulary.EDIT_METADATA_COMMENT || "Comment"}
                </Text>
                <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={comment}
                    onChangeText={setComment}
                    placeholder={
                        vocabulary.EDIT_METADATA_COMMENT_PLACEHOLDER ||
                        "Optional: explain why"
                    }
                    placeholderTextColor={COLORS.gray600}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
            </View>

            {/* Error */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Buttons */}
            <View style={styles.buttonRow}>
                <Pressable
                    style={styles.secondaryButton}
                    onPress={onClose}
                    disabled={submitting}
                >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.primaryButton,
                        submitting && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                        <Text style={styles.primaryButtonText}>
                            {vocabulary.EDIT_METADATA_SUBMIT ||
                                "Submit Suggestion"}
                        </Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

interface EditMetadataModalProps {
    visible: boolean;
    media: MediaForEdit;
    onClose: () => void;
}

export default function EditMetadataModal({
    visible,
    media,
    onClose,
}: EditMetadataModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.keyboardView}
                >
                    <Pressable
                        style={styles.card}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <EditMetadataModalContent
                            media={media}
                            onClose={onClose}
                        />
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "center",
        padding: 16,
    },
    keyboardView: {
        flex: 1,
        justifyContent: "center",
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
        padding: 20,
        maxHeight: "90%",
        width: "100%",
    },
    scrollView: {
        maxHeight: 500,
    },
    successContainer: {
        alignItems: "center",
        paddingVertical: 32,
        gap: 12,
    },
    successIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(52, 211, 153, 0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    successIconText: {
        fontSize: 32,
        color: "#34d399",
        fontWeight: "700",
    },
    successTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },
    successSubtitle: {
        color: COLORS.gray400,
        fontSize: 14,
        textAlign: "center",
        marginBottom: 8,
    },
    mediaInfo: {
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    mediaTitle: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "600",
    },
    mediaSubtitle: {
        color: COLORS.gray400,
        fontSize: 12,
        marginTop: 2,
    },
    fieldGroup: {
        marginBottom: 12,
    },
    fieldLabel: {
        color: COLORS.gray400,
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.bgCardLight,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.white,
        fontSize: 14,
        borderWidth: 1,
        borderColor: COLORS.gray800,
    },
    inputMultiline: {
        minHeight: 80,
        paddingTop: 12,
    },
    errorText: {
        color: COLORS.accent,
        fontSize: 13,
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
    secondaryButton: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.gray600,
        paddingVertical: 14,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "600",
    },
    primaryButton: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: COLORS.accent,
        paddingVertical: 14,
        alignItems: "center",
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
    },
    buttonDisabled: {
        opacity: 0.4,
    },
});
