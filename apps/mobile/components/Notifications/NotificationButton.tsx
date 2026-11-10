import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
    notificationVocabularyText,
    replaceNotificationGaps,
} from "@rockit/shared";
import { ActionButton, IconButton, useDesignTheme } from "@rockit/ui";
import { Bell } from "@rockit/ui/icons";
import { FlatList, Text, View } from "react-native";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useSheet } from "@/lib/SheetContext";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

function NotificationCenter() {
    const theme = useDesignTheme();
    const { vocabulary, lang } = useVocabulary();
    const { notificationInbox: manager } = usePlayerServices();
    const items = useStore(manager.notificationsAtom);
    const total = useStore(manager.totalCountAtom);
    const error = useStore(manager.errorAtom);
    const [offset, setOffset] = useState(0);
    const [unread, setUnread] = useState(false);
    const sheet = useSheet();
    const router = useTypedRouter();
    useEffect(() => manager.setPage(offset, unread), [manager, offset, unread]);
    const copy = {
        color: theme.colors.foreground,
        fontSize: theme.typography.body,
    };
    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item.publicId}
            initialNumToRender={10}
            windowSize={5}
            contentContainerStyle={{
                padding: theme.spacing.lg,
                gap: theme.spacing.lg,
            }}
            ListHeaderComponent={
                <View style={{ gap: theme.spacing.md }}>
                    <Text style={{ ...copy, fontSize: theme.typography.title }}>
                        {vocabulary.NOTIFICATIONS_TITLE}
                    </Text>
                    <ActionButton
                        label={vocabulary.NOTIFICATIONS_UNREAD}
                        selected={unread}
                        onPress={() => {
                            setOffset(0);
                            setUnread((value) => !value);
                        }}
                    />
                    {error && (
                        <ActionButton
                            label={vocabulary.RETRY}
                            onPress={() => void manager.refreshAsync()}
                        />
                    )}
                </View>
            }
            ListEmptyComponent={
                <Text style={copy}>{vocabulary.NOTIFICATIONS_EMPTY}</Text>
            }
            renderItem={({ item }) => (
                <View
                    style={{
                        gap: theme.spacing.sm,
                        padding: theme.spacing.md,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.secondary,
                    }}
                >
                    <Text
                        style={{
                            ...copy,
                            fontWeight: item.readAt ? "400" : "700",
                        }}
                    >
                        {replaceNotificationGaps(
                            notificationVocabularyText(
                                vocabulary,
                                item.vocabularyKey
                            ),
                            item.replacements
                        )}
                    </Text>
                    <Text
                        style={{
                            color: theme.colors["muted-foreground"],
                            fontSize: theme.typography.caption,
                        }}
                    >
                        {new Date(item.dateAdded).toLocaleString(lang)}
                    </Text>
                    {item.destination && (
                        <ActionButton
                            label={vocabulary.NOTIFICATIONS_OPEN}
                            onPress={() =>
                                void manager
                                    .destinationAsync(item)
                                    .then((url) => {
                                        if (url) {
                                            sheet.close();
                                            router.push(url);
                                        }
                                    })
                            }
                        />
                    )}
                    {!item.readAt && (
                        <ActionButton
                            label={vocabulary.NOTIFICATIONS_MARK_READ}
                            onPress={() => void manager.markRead(item.publicId)}
                        />
                    )}
                </View>
            )}
            ListFooterComponent={
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: theme.spacing.sm,
                    }}
                >
                    <ActionButton
                        label={vocabulary.PREVIOUS_MEDIA}
                        disabled={offset === 0}
                        onPress={() =>
                            setOffset((value) => Math.max(0, value - 20))
                        }
                    />
                    <ActionButton
                        label={vocabulary.NEXT_MEDIA}
                        disabled={offset + 20 >= total}
                        onPress={() => setOffset((value) => value + 20)}
                    />
                </View>
            }
        />
    );
}
export default function NotificationButton() {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    const { notificationInbox } = usePlayerServices();
    const unread = useStore(notificationInbox.unreadCountAtom);
    const { open } = useSheet();
    return (
        <View style={{ position: "absolute", right: theme.spacing.lg }}>
            <IconButton
                label={vocabulary.NOTIFICATIONS_TITLE}
                onPress={() =>
                    open({
                        content: <NotificationCenter />,
                        snapPoints: ["85%"],
                        scrollable: false,
                    })
                }
            >
                <Bell color={theme.colors.foreground} />
            </IconButton>
            {unread > 0 && (
                <Text
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        color: theme.colors["primary-foreground"],
                        backgroundColor: theme.colors.primary,
                        borderRadius: theme.radius.full,
                        paddingHorizontal: theme.spacing.xs,
                        fontSize: theme.typography.caption,
                    }}
                >
                    {unread}
                </Text>
            )}
        </View>
    );
}
