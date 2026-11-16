import { useStore } from "@nanostores/react";
import { useDesignTheme } from "@rockit/ui";
import { useLyricsSourceProposal } from "@rockit/ui/headless/useLyricsSourceProposal";
import { CheckCircle2, ExternalLink, FileMusic, Send } from "@rockit/ui/icons";
import {
    Linking,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";

export default function LyricsMissing({
    mediaPublicId,
}: {
    mediaPublicId: string;
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const session = useStore(rockIt.userManager.sessionAtom);
    const proposal = useLyricsSourceProposal(
        Http,
        mediaPublicId,
        () =>
            !!session &&
            rockIt.userManager.sessionAtom.get() === session &&
            rockIt.queueManager.currentMediaAtom.get()?.publicId ===
                mediaPublicId
    );
    const error =
        proposal.error === "invalid"
            ? vocabulary.LYRICS_SOURCE_INVALID
            : proposal.error === "notFound"
              ? vocabulary.LYRICS_SOURCE_NOT_FOUND
              : proposal.error
                ? vocabulary.LYRICS_SOURCE_UNAVAILABLE
                : undefined;
    const Icon = proposal.sent ? CheckCircle2 : FileMusic;
    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: theme.spacing.xl,
            }}
        >
            <View
                style={{
                    width: "100%",
                    maxWidth: 360,
                    alignItems: "center",
                    gap: theme.spacing.lg,
                }}
            >
                <Icon
                    size={32}
                    color={
                        proposal.sent
                            ? theme.colors.primary
                            : theme.colors["muted-foreground"]
                    }
                />
                <Text
                    accessibilityLiveRegion="polite"
                    accessibilityRole="header"
                    style={{
                        fontSize: theme.typography.title,
                        fontWeight: "700",
                        color: theme.colors.foreground,
                        textAlign: "center",
                    }}
                >
                    {proposal.sent
                        ? vocabulary.LYRICS_SOURCE_SENT
                        : vocabulary.LYRICS_MISSING_TITLE}
                </Text>
                <Text
                    style={{
                        color: theme.colors["muted-foreground"],
                        lineHeight: 22,
                        textAlign: "center",
                    }}
                >
                    {proposal.sent
                        ? vocabulary.LYRICS_SOURCE_REVIEW
                        : vocabulary.LYRICS_SOURCE_HELP}
                </Text>
                {!proposal.sent && (
                    <>
                        <Pressable
                            accessibilityRole="link"
                            accessibilityLabel={vocabulary.LYRICS_SOURCE_SEARCH}
                            onPress={() => {
                                void Linking.openURL(
                                    "https://lrclib.net"
                                ).catch(() =>
                                    toasterManager.notifyError(vocabulary.ERROR)
                                );
                            }}
                            style={{
                                minHeight: theme.layout.touchTarget,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: theme.spacing.sm,
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.colors.primary,
                                    fontWeight: "600",
                                }}
                            >
                                {vocabulary.LYRICS_SOURCE_SEARCH}
                            </Text>
                            <ExternalLink
                                size={15}
                                color={theme.colors.primary}
                            />
                        </Pressable>
                        <View
                            style={{
                                width: "100%",
                                maxWidth: 256,
                                alignItems: "center",
                                gap: theme.spacing.md,
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.colors["muted-foreground"],
                                    fontSize: theme.typography.caption,
                                    textAlign: "center",
                                }}
                            >
                                {vocabulary.LYRICS_SOURCE_ID}
                            </Text>
                            <TextInput
                                accessibilityLabel={vocabulary.LYRICS_SOURCE_ID}
                                placeholder={
                                    vocabulary.LYRICS_SOURCE_PLACEHOLDER
                                }
                                placeholderTextColor={
                                    theme.colors["muted-foreground"]
                                }
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={proposal.value}
                                onChangeText={proposal.setValue}
                                editable={!proposal.busy}
                                onSubmitEditing={() => void proposal.submit()}
                                style={{
                                    width: "100%",
                                    minHeight: theme.layout.touchTarget,
                                    color: theme.colors.foreground,
                                    fontSize: 18,
                                    textAlign: "center",
                                    padding: theme.spacing.md,
                                    borderBottomWidth: 1,
                                    borderBottomColor: error
                                        ? theme.colors.destructive
                                        : theme.colors.border,
                                }}
                            />
                            {error && (
                                <Text
                                    accessibilityRole="alert"
                                    style={{
                                        color: theme.colors.destructive,
                                        textAlign: "center",
                                    }}
                                >
                                    {error}
                                </Text>
                            )}
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={
                                    proposal.busy
                                        ? vocabulary.METADATA_SUBMITTING
                                        : vocabulary.LYRICS_SOURCE_SUBMIT
                                }
                                accessibilityState={{
                                    disabled: !proposal.valid || proposal.busy,
                                }}
                                disabled={!proposal.valid || proposal.busy}
                                onPress={() => void proposal.submit()}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: theme.spacing.sm,
                                    opacity:
                                        !proposal.valid || proposal.busy
                                            ? 0.4
                                            : 1,
                                }}
                            >
                                <Send size={16} color={theme.colors.primary} />
                                <Text
                                    style={{
                                        color: theme.colors.primary,
                                        fontWeight: "600",
                                    }}
                                >
                                    {proposal.busy
                                        ? vocabulary.METADATA_SUBMITTING
                                        : vocabulary.LYRICS_SOURCE_SUBMIT}
                                </Text>
                            </Pressable>
                            <Text
                                style={{
                                    color: theme.colors["muted-foreground"],
                                    fontSize: theme.typography.caption,
                                    lineHeight: 18,
                                    textAlign: "center",
                                }}
                            >
                                {vocabulary.LYRICS_SOURCE_REVIEW}
                            </Text>
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
    );
}
