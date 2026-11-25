import { useState } from "react";
import type { LyricsCorrectionContextResponse } from "@/dto";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import {
    lyricsCorrectionError,
    useLyricsCorrectionDraft,
} from "@rockit/ui/headless/useLyricsCorrectionDraft";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";

export default function LyricsCorrectionPanel({
    publicId,
    onBack,
}: {
    publicId: string;
    onBack: () => void;
}) {
    const { vocabulary: v } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const resource = useAsyncResource(async () => {
        const response = await Http.getLyricsCorrectionContextAsync(publicId);
        if (!response.isOk()) throw new Error(response.message);
        return response.result;
    }, publicId);
    const snapshot = resource.data;
    const message = resource.loading
        ? v.LYRICS_LOADING
        : !snapshot?.lines.length
          ? v.LYRICS_UNAVAILABLE
          : snapshot.syncStatus === "pending"
            ? v.LYRICS_SOURCE_PENDING
            : !snapshot.revision
              ? v.LYRICS_LOCAL_REQUIRED
              : null;

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
        >
            <Pressable
                accessibilityRole="button"
                style={styles.button}
                onPress={onBack}
            >
                <Text style={styles.action}>{v.CANCEL}</Text>
            </Pressable>
            <Text style={styles.heading}>{v.LYRICS_CORRECTION_TITLE}</Text>
            {message ? (
                <Text style={styles.label}>{message}</Text>
            ) : (
                snapshot && (
                    <Editor
                        key={snapshot.revision}
                        snapshot={snapshot}
                        publicId={publicId}
                    />
                )
            )}
        </ScrollView>
    );
}

function TimeField({
    label,
    value,
    optional,
    signed,
    disabled,
    onChange,
}: {
    label: string;
    value: number | null;
    optional?: boolean;
    signed?: boolean;
    disabled: boolean;
    onChange: (time: number | null) => void;
}) {
    const styles = useThemedStyles(createStyles);
    const [draft, setDraft] = useState(
        value === null || !Number.isFinite(value) ? "" : String(value)
    );
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                keyboardType="numbers-and-punctuation"
                inputMode={signed ? undefined : "decimal"}
                style={styles.input}
                value={draft}
                editable={!disabled}
                onChangeText={(text) => {
                    setDraft(text);
                    const normalized = text.trim().replace(",", ".");
                    onChange(
                        normalized === ""
                            ? optional
                                ? null
                                : NaN
                            : Number(normalized)
                    );
                }}
            />
        </View>
    );
}

function Editor({
    snapshot,
    publicId,
}: {
    snapshot: LyricsCorrectionContextResponse;
    publicId: string;
}) {
    const { vocabulary: v } = useVocabulary();
    const styles = useThemedStyles(createStyles);
    const { offset, setOffset, lines, editLine, editWord, changed, proposal } =
        useLyricsCorrectionDraft(snapshot);
    const [index, setIndex] = useState(0);
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string>();
    const selected = lines[index];
    const locked = pending || sent;

    const submit = async () => {
        if (!proposal.success || !changed || locked) return;
        setPending(true);
        setError(undefined);
        try {
            const response = await Http.createRequest({
                mediaPublicId: publicId,
                requestType: "LYRICS",
                proposedValue: JSON.stringify(proposal.data),
                comment: null,
            });
            if (response.isOk()) setSent(true);
            else setError(lyricsCorrectionError(v, response.detail));
        } catch {
            setError(v.EDIT_METADATA_ERROR);
        } finally {
            setPending(false);
        }
    };

    return (
        <View style={styles.content}>
            <TimeField
                label={v.LYRICS_OFFSET_LABEL}
                signed
                value={offset}
                disabled={locked}
                onChange={(value) => setOffset(value ?? NaN)}
            />
            <Text style={styles.label}>{v.LYRICS_OFFSET_HELP}</Text>
            <View style={styles.row}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={v.LYRICS_PREVIOUS_LINE}
                    style={styles.button}
                    disabled={index === 0}
                    onPress={() => setIndex((i) => i - 1)}
                >
                    <Text style={styles.action}>‹</Text>
                </Pressable>
                <Text style={styles.label}>
                    {v.LYRICS_EDIT_POSITION.replace(
                        "{line}",
                        String(index + 1)
                    ).replace("{total}", String(lines.length))}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={v.LYRICS_NEXT_LINE}
                    style={styles.button}
                    disabled={index >= lines.length - 1}
                    onPress={() => setIndex((i) => i + 1)}
                >
                    <Text style={styles.action}>›</Text>
                </Pressable>
            </View>
            <View key={index} style={styles.content}>
                {selected.words.length ? (
                    <>
                        <Text style={styles.heading}>{selected.text}</Text>
                        <Text style={styles.label}>{v.LYRICS_WORDS_HELP}</Text>
                        {selected.words.map((word, i) => (
                            <View key={i} style={styles.word}>
                                <TextInput
                                    accessibilityLabel={`${v.LYRICS_WORD_TEXT} ${i + 1}`}
                                    style={styles.input}
                                    editable={!locked}
                                    value={word.text}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    onChangeText={(text) =>
                                        editWord(index, i, { text })
                                    }
                                />
                                <View style={styles.row}>
                                    <TimeField
                                        label={v.LYRICS_WORD_START}
                                        value={word.timestamp_s}
                                        disabled={locked}
                                        onChange={(value) =>
                                            editWord(index, i, {
                                                timestamp_s: value ?? NaN,
                                            })
                                        }
                                    />
                                    <TimeField
                                        label={v.LYRICS_WORD_END}
                                        value={word.end_timestamp_s}
                                        optional
                                        disabled={locked}
                                        onChange={(value) =>
                                            editWord(index, i, {
                                                end_timestamp_s: value,
                                            })
                                        }
                                    />
                                </View>
                            </View>
                        ))}
                    </>
                ) : (
                    <>
                        <TextInput
                            accessibilityLabel={v.LYRICS_TEXT}
                            style={styles.input}
                            editable={!locked}
                            value={selected.text}
                            onChangeText={(text) =>
                                editLine(index, (line) => ({ ...line, text }))
                            }
                        />
                        {selected.timestamp_s !== null && (
                            <TimeField
                                label={v.LYRICS_TIME}
                                value={selected.timestamp_s}
                                disabled={locked}
                                onChange={(value) =>
                                    editLine(index, (line) => ({
                                        ...line,
                                        timestamp_s: value ?? NaN,
                                        end_timestamp_s: null,
                                    }))
                                }
                            />
                        )}
                    </>
                )}
            </View>
            <Text style={styles.label}>{v.LYRICS_REVIEW_HELP}</Text>
            {!proposal.success && changed && (
                <Text accessibilityRole="alert" style={styles.error}>
                    {v.LYRICS_INVALID_CORRECTION}
                </Text>
            )}
            {error && (
                <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                </Text>
            )}
            {sent ? (
                <Text accessibilityLiveRegion="polite" style={styles.label}>
                    {v.LYRICS_PROPOSAL_SENT}
                </Text>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    style={styles.button}
                    disabled={!proposal.success || !changed || pending}
                    onPress={() => void submit()}
                >
                    <Text style={styles.action}>
                        {pending ? v.LYRICS_LOADING : v.LYRICS_PROPOSE}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        content: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
        heading: {
            color: theme.colors.foreground,
            fontSize: theme.typography.subtitle,
            fontWeight: "600",
        },
        label: {
            color: theme.colors["muted-foreground"],
            fontSize: theme.typography.label,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
        },
        word: {
            gap: theme.spacing.xs,
            paddingBottom: theme.spacing.sm,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
        },
        field: { flex: 1, gap: theme.spacing.xs },
        input: {
            color: theme.colors.foreground,
            backgroundColor: theme.colors.muted,
            minHeight: 44,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.sm,
        },
        button: {
            minHeight: 44,
            minWidth: 44,
            justifyContent: "center",
            alignItems: "center",
        },
        action: { color: theme.colors.primary, fontWeight: "600" },
        error: { color: theme.colors["destructive-soft"] },
    });
