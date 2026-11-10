import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { ActionButton, MediaIdentity, useDesignTheme } from "@rockit/ui";
import { FlatList, Text, TextInput, View } from "react-native";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useSheet } from "@/lib/SheetContext";
import { useVocabulary } from "@/lib/vocabulary";

function ShareForm({ publicId }: { publicId: string }) {
    const { friendManager, sharingManager } = usePlayerServices();
    const friends = useStore(friendManager.friendsAtom);
    const error = useStore(friendManager.errorAtom);
    const loading = useStore(friendManager.loadingAtom);
    const { vocabulary: v } = useVocabulary();
    const theme = useDesignTheme();
    const [recipient, setRecipient] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    useEffect(() => {
        void friendManager.fetchFriends();
    }, [friendManager]);
    const send = async () => {
        if (!recipient || sending) return;
        setSending(true);
        try {
            if (
                await sharingManager.shareMedia(
                    recipient,
                    publicId,
                    message.trim() || undefined
                )
            )
                sharingManager.closeComposer();
        } finally {
            setSending(false);
        }
    };
    return (
        <FlatList
            data={friends}
            keyExtractor={(friend) => friend.publicId}
            initialNumToRender={10}
            windowSize={5}
            contentContainerStyle={{
                padding: theme.spacing.lg,
                gap: theme.spacing.md,
            }}
            ListHeaderComponent={
                <View style={{ gap: theme.spacing.md }}>
                    <Text
                        style={{
                            color: theme.colors.foreground,
                            fontSize: theme.typography.title,
                        }}
                    >
                        {v.FRIENDS_SHARE_TO}
                    </Text>
                    <TextInput
                        accessibilityLabel={v.FRIENDS_SHARE_MESSAGE}
                        placeholder={v.FRIENDS_SHARE_MESSAGE}
                        placeholderTextColor={theme.colors["muted-foreground"]}
                        value={message}
                        onChangeText={setMessage}
                        maxLength={2000}
                        multiline
                        editable={!sending}
                        style={{
                            color: theme.colors.foreground,
                            backgroundColor: theme.colors.secondary,
                            borderRadius: theme.radius.md,
                            padding: theme.spacing.md,
                            fontSize: theme.typography.body,
                        }}
                    />
                    {error && (
                        <ActionButton
                            label={v.RETRY}
                            onPress={() => void friendManager.fetchFriends()}
                        />
                    )}
                </View>
            }
            ListEmptyComponent={
                <Text style={{ color: theme.colors["muted-foreground"] }}>
                    {loading ? v.MOBILE_LOADING : v.FRIENDS_NO_FRIENDS}
                </Text>
            }
            renderItem={({ item }) => (
                <View style={{ gap: theme.spacing.sm }}>
                    <MediaIdentity
                        title={item.username}
                        imageUrl={item.imageUrl}
                        round
                    />
                    <ActionButton
                        label={item.username}
                        selected={recipient === item.publicId}
                        disabled={sending}
                        onPress={() => setRecipient(item.publicId)}
                    />
                </View>
            )}
            ListFooterComponent={
                <View style={{ gap: theme.spacing.sm }}>
                    <ActionButton
                        label={v.FRIENDS_SHARE}
                        disabled={
                            !friends.some(
                                (friend) => friend.publicId === recipient
                            ) || sending
                        }
                        onPress={() => void send()}
                    />
                    <ActionButton
                        label={v.CANCEL}
                        disabled={sending}
                        onPress={() => sharingManager.closeComposer()}
                    />
                </View>
            }
        />
    );
}

export default function ShareMediaComposer() {
    const { friendManager, sharingManager } = usePlayerServices();
    const publicId = useStore(sharingManager.composeMediaAtom);
    const scope = useStore(friendManager.scopeAtom);
    const { open, close } = useSheet();
    useEffect(() => {
        if (!publicId) return;
        open({
            content: (
                <ShareForm key={`${scope}:${publicId}`} publicId={publicId} />
            ),
            snapPoints: ["85%"],
            scrollable: false,
            onClose: () => {
                if (
                    friendManager.scopeAtom.get() === scope &&
                    sharingManager.composeMediaAtom.get() === publicId
                )
                    sharingManager.closeComposer();
            },
        });
        return close;
    }, [publicId, scope, friendManager, sharingManager, open, close]);
    return null;
}
