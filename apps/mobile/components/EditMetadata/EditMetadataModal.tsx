import { useState } from "react";
import {
    CONTENT_RATING_OPTIONS,
    getContentRatingValue,
    getMediaArtistsString,
    getMediaSubtitle,
    isSongWithAlbum,
    type ContentRatingValue,
    type TMedia,
    type Vocabulary,
} from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
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
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";

interface FieldDef {
    key: string;
    label: string;
    value: string;
    multiline: boolean;
}

function getFieldsForMedia(media: TMedia, vocabulary: Vocabulary): FieldDef[] {
    switch (media.type) {
        case "song":
            return [
                {
                    key: "title",
                    label: vocabulary.EDIT_METADATA_FIELD_TITLE,
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: vocabulary.ARTIST,
                    value: getMediaArtistsString(media),
                    multiline: false,
                },
                {
                    key: "album",
                    label: vocabulary.ALBUM,
                    value: isSongWithAlbum(media) ? media.album.name : "",
                    multiline: false,
                },
                {
                    key: "genre",
                    label: vocabulary.EDIT_METADATA_FIELD_GENRE,
                    value: "",
                    multiline: false,
                },
                {
                    key: "lyrics",
                    label: vocabulary.LYRICS,
                    value: "",
                    multiline: true,
                },
            ];
        case "video":
            return [
                {
                    key: "title",
                    label: vocabulary.EDIT_METADATA_FIELD_TITLE,
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: vocabulary.ARTIST,
                    value: getMediaArtistsString(media),
                    multiline: false,
                },
                {
                    key: "genre",
                    label: vocabulary.EDIT_METADATA_FIELD_GENRE,
                    value: "",
                    multiline: false,
                },
            ];
        case "album":
            return [
                {
                    key: "title",
                    label: vocabulary.NAME,
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "artist",
                    label: vocabulary.ARTIST,
                    value: getMediaArtistsString(media),
                    multiline: false,
                },
                {
                    key: "releaseDate",
                    label: vocabulary.EDIT_METADATA_FIELD_RELEASE_DATE,
                    value: media.releaseDate ?? "",
                    multiline: false,
                },
                {
                    key: "genre",
                    label: vocabulary.EDIT_METADATA_FIELD_GENRE,
                    value: "",
                    multiline: false,
                },
            ];
        case "artist":
            return [
                {
                    key: "title",
                    label: vocabulary.NAME,
                    value: media.name,
                    multiline: false,
                },
                {
                    key: "genre",
                    label: vocabulary.EDIT_METADATA_FIELD_GENRE,
                    value: "",
                    multiline: false,
                },
            ];
        default:
            return [];
    }
}

interface EditMetadataModalContentProps {
    media: TMedia;
    onClose: () => void;
}

export function EditMetadataModalContent({
    media,
    onClose,
}: EditMetadataModalContentProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    const [fields, setFields] = useState<FieldDef[]>(() =>
        getFieldsForMedia(media, vocabulary)
    );
    const [rating, setRating] = useState<ContentRatingValue | null>(null);
    const initialRating = getContentRatingValue(
        media.type === "song" ? media : {}
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

        if (rating !== null && media.type === "song") changes.explicit = rating;
        const mediaPublicId = media.publicId;

        const result = await Http.createRequest({
            mediaPublicId,
            requestType: "METADATA",
            proposedValue: JSON.stringify(changes),
            comment: comment.trim() || null,
        });

        if (result.isOk()) {
            setSubmitted(true);
        } else {
            setError(
                typeof result.detail === "string"
                    ? result.detail
                    : vocabulary.EDIT_METADATA_ERROR ||
                          vocabulary.MOBILE_METADATA_ERROR
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
                    {vocabulary.EDIT_METADATA_SUCCESS ||
                        vocabulary.MOBILE_METADATA_SUBMITTED}
                </Text>
                <Text style={styles.successSubtitle}>
                    {vocabulary.MOBILE_METADATA_REVIEW}
                </Text>
                <Pressable style={styles.primaryButton} onPress={onClose}>
                    <Text style={styles.primaryButtonText}>
                        {vocabulary.CANCEL}
                    </Text>
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
                        placeholderTextColor={theme.legacy.gray600}
                        multiline={field.multiline}
                        numberOfLines={field.multiline ? 4 : 1}
                        textAlignVertical={field.multiline ? "top" : "center"}
                    />
                </View>
            ))}

            {media.type === "song" && (
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                        {vocabulary.CONTENT_RATING_LABEL}
                    </Text>
                    <View
                        accessibilityRole="radiogroup"
                        style={styles.ratingOptions}
                    >
                        {CONTENT_RATING_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                accessibilityRole="radio"
                                accessibilityState={{
                                    checked:
                                        (rating ?? initialRating) ===
                                        option.value,
                                }}
                                onPress={() => setRating(option.value)}
                                style={[
                                    styles.ratingOption,
                                    (rating ?? initialRating) ===
                                        option.value && styles.ratingSelected,
                                ]}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {vocabulary[option.label]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={styles.successSubtitle}>
                        {vocabulary.CONTENT_RATING_REVIEW_HINT}
                    </Text>
                </View>
            )}
            {/* Comment */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                    {vocabulary.EDIT_METADATA_COMMENT ||
                        vocabulary.EDIT_METADATA_COMMENT}
                </Text>
                <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={comment}
                    onChangeText={setComment}
                    placeholder={
                        vocabulary.EDIT_METADATA_COMMENT_PLACEHOLDER ||
                        vocabulary.MOBILE_METADATA_COMMENT_HINT
                    }
                    placeholderTextColor={theme.legacy.gray600}
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
                    <Text style={styles.secondaryButtonText}>
                        {vocabulary.CANCEL}
                    </Text>
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
                        <ActivityIndicator
                            color={theme.legacy.white}
                            size="small"
                        />
                    ) : (
                        <Text style={styles.primaryButtonText}>
                            {vocabulary.EDIT_METADATA_SUBMIT ||
                                vocabulary.MOBILE_METADATA_SUBMIT}
                        </Text>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

interface EditMetadataModalProps {
    visible: boolean;
    media: TMedia;
    onClose: () => void;
}

export default function EditMetadataModal({
    visible,
    media,
    onClose,
}: EditMetadataModalProps) {
    const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: withAlpha(theme.colors["backdrop"], 0.75),
            justifyContent: "center",
            padding: theme.spacing.lg,
        },
        keyboardView: {
            flex: 1,
            justifyContent: "center",
        },
        card: {
            backgroundColor: theme.legacy.bgCard,
            borderRadius: theme.radius.xl,
            padding: 20,
            maxHeight: "90%",
            width: "100%",
        },
        scrollView: {
            maxHeight: 500,
        },
        successContainer: {
            alignItems: "center",
            paddingVertical: theme.spacing.xxl,
            gap: theme.spacing.md,
        },
        successIcon: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: withAlpha(theme.colors["success"], 0.1),
            alignItems: "center",
            justifyContent: "center",
        },
        successIconText: {
            fontSize: theme.typography.heading,
            color: theme.colors["success"],
            fontWeight: "700",
        },
        successTitle: {
            color: theme.legacy.white,
            fontSize: theme.typography.subtitle,
            fontWeight: "700",
            textAlign: "center",
        },
        successSubtitle: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.body,
            textAlign: "center",
            marginBottom: theme.spacing.sm,
        },
        mediaInfo: {
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
        },
        mediaTitle: {
            color: theme.legacy.white,
            fontSize: 15,
            fontWeight: "600",
        },
        mediaSubtitle: {
            color: theme.legacy.gray400,
            fontSize: theme.typography.caption,
            marginTop: 2,
        },
        ratingOptions: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
        },
        ratingOption: {
            borderWidth: 1,
            borderColor: theme.colors["border"],
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            minHeight: 44,
        },
        ratingSelected: {
            borderColor: theme.colors["primary"],
            backgroundColor: theme.colors["muted"],
        },
        fieldGroup: {
            marginBottom: theme.spacing.md,
        },
        fieldLabel: {
            color: theme.legacy.gray400,
            fontSize: 11,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
        },
        input: {
            backgroundColor: theme.legacy.bgCardLight,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: theme.spacing.md,
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            borderWidth: 1,
            borderColor: theme.legacy.gray800,
        },
        inputMultiline: {
            minHeight: 80,
            paddingTop: theme.spacing.md,
        },
        errorText: {
            color: theme.legacy.accent,
            fontSize: 13,
            marginBottom: theme.spacing.sm,
        },
        buttonRow: {
            flexDirection: "row",
            gap: 10,
            marginTop: theme.spacing.sm,
        },
        secondaryButton: {
            flex: 1,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.legacy.gray600,
            paddingVertical: 14,
            alignItems: "center",
        },
        secondaryButtonText: {
            color: theme.legacy.white,
            fontSize: 15,
            fontWeight: "600",
        },
        primaryButton: {
            flex: 1,
            borderRadius: 10,
            backgroundColor: theme.legacy.accent,
            paddingVertical: 14,
            alignItems: "center",
        },
        primaryButtonText: {
            color: theme.legacy.white,
            fontSize: 15,
            fontWeight: "700",
        },
        buttonDisabled: {
            opacity: 0.4,
        },
    });
