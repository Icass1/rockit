import { useCallback, useState } from "react";
import { confirmAction } from "@/platform/confirmAction";
import { useStore } from "@nanostores/react";
import { ActionButton, MediaIdentity, useDesignTheme } from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { useFocusEffect } from "expo-router";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import type {
    MobileSocialRow,
    MobileSocialTab,
} from "@/models/interfaces/socialTab";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";

export default function FriendsScreen() {
    const theme = useDesignTheme();
    const { vocabulary: v } = useVocabulary();
    const services = usePlayerServices();
    const manager = services.friendManager;
    const listening = services.listenTogetherManager;
    const sharing = services.sharingManager;
    const router = useTypedRouter();
    const friends = useStore(manager.friendsAtom);
    const blocked = useStore(manager.blockedAtom);
    const incoming = useStore(manager.incomingRequestsAtom);
    const sentRequests = useStore(manager.sentRequestsAtom);
    const activity = useStore(manager.activityAtom);
    const results = useStore(manager.searchResultsAtom);
    const sessions = useStore(listening.sessionsAtom);
    const inbox = useStore(sharing.inboxAtom);
    const sent = useStore(sharing.sentAtom);
    const busy = useStore(listening.loadingAtom);
    const loading = useStore(manager.loadingAtom);
    const error = useStore(manager.errorAtom);
    const scope = useStore(manager.scopeAtom);
    const [tab, setTab] = useState<MobileSocialTab>("friends");
    const [query, setQuery] = useState("");
    const ranks = useAsyncResource(
        () => manager.fetchLeaderboard(),
        String(scope),
        tab === "leaderboard"
    );
    useFocusEffect(
        useCallback(() => {
            if (tab === "friends") void manager.fetchFriends();
            else if (tab === "requests") void manager.fetchRequests();
            else if (tab === "activity") void manager.fetchActivity();
            else if (tab === "blocked") void manager.fetchBlocked();
            else if (tab === "inbox") void sharing.fetchInbox();
            else if (tab === "sent") void sharing.fetchSent();
        }, [manager, sharing, tab])
    );
    const tabs = [
        { key: "friends", label: v.FRIENDS_LIST },
        { key: "requests", label: v.FRIENDS_FRIEND_REQUESTS },
        { key: "search", label: v.SEARCH },
        { key: "activity", label: v.FRIENDS_ACTIVITY },
        { key: "sessions", label: v.FRIENDS_PARTY },
        { key: "leaderboard", label: v.FRIENDS_LEADERBOARD },
        { key: "inbox", label: v.FRIENDS_SHARE_RECEIVED },
        { key: "sent", label: v.FRIENDS_SHARE_SENT },
        { key: "blocked", label: v.FRIENDS_BLOCKED },
    ] as const;
    const rows: MobileSocialRow[] =
        tab === "friends"
            ? friends.map((value) => ({ kind: "friend", value }))
            : tab === "blocked"
              ? blocked.map((value) => ({ kind: "blocked", value }))
              : tab === "requests"
                ? [
                      ...incoming.map((value) => ({
                          kind: "request" as const,
                          value,
                      })),
                      ...sentRequests.map((value) => ({
                          kind: "pending" as const,
                          value,
                      })),
                  ]
                : tab === "search"
                  ? results.map((value) => ({ kind: "search", value }))
                  : tab === "activity"
                    ? activity.map((value) => ({ kind: "activity", value }))
                    : tab === "sessions"
                      ? sessions.map((value) => ({ kind: "session", value }))
                      : tab === "leaderboard"
                        ? (ranks.data?.entries ?? []).map((value) => ({
                              kind: "rank",
                              value,
                          }))
                        : (tab === "sent" ? sent : inbox).map((value) => ({
                              kind: tab === "sent" ? "sent" : "inbox",
                              value,
                          }));
    const copy = {
        color: theme.colors.foreground,
        fontSize: theme.typography.body,
    };
    const confirm = async (label: string, action: () => Promise<unknown>) => {
        if (await confirmAction(label, label, v.YES, v.CANCEL)) await action();
    };
    return (
        <FlatList
            data={rows}
            keyExtractor={(item) =>
                `${item.kind}:${"publicId" in item.value ? item.value.publicId : "userId" in item.value ? item.value.userId : `${item.value.userPublicId}:${item.value.listenedAt}`}`
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            contentContainerStyle={{
                paddingTop: theme.layout.mobileContentTop,
                paddingBottom: theme.layout.mobileContentBottom,
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.lg,
            }}
            ListHeaderComponent={
                <View style={{ gap: theme.spacing.lg }}>
                    <Text
                        style={{ ...copy, fontSize: theme.typography.heading }}
                    >
                        {v.FRIENDS}
                    </Text>
                    <ScrollView
                        horizontal
                        contentContainerStyle={{ gap: theme.spacing.sm }}
                    >
                        {tabs.map((item) => (
                            <ActionButton
                                key={item.key}
                                label={item.label}
                                selected={tab === item.key}
                                onPress={() => setTab(item.key)}
                            />
                        ))}
                    </ScrollView>
                    {(loading || ranks.loading) && (
                        <Text style={copy}>{v.MOBILE_LOADING}</Text>
                    )}
                    {(error || ranks.error) && (
                        <Text
                            accessibilityRole="alert"
                            style={{ ...copy, color: theme.colors.destructive }}
                        >
                            {error ?? v.ERROR}
                        </Text>
                    )}
                    {tab === "leaderboard" && ranks.error && (
                        <ActionButton
                            label={v.RETRY}
                            onPress={() => void ranks.refresh()}
                        />
                    )}
                    {tab === "search" && (
                        <>
                            <TextInput
                                accessibilityLabel={
                                    v.FRIENDS_SEARCH_PLACEHOLDER
                                }
                                placeholder={v.FRIENDS_SEARCH_PLACEHOLDER}
                                value={query}
                                onChangeText={setQuery}
                                onSubmitEditing={() =>
                                    void manager.searchUsers(query)
                                }
                                returnKeyType="search"
                                style={{
                                    ...copy,
                                    minHeight: theme.layout.touchTarget,
                                    backgroundColor: theme.colors.secondary,
                                    borderRadius: theme.radius.md,
                                    padding: theme.spacing.md,
                                }}
                            />
                            <ActionButton
                                label={v.SEARCH}
                                onPress={() => void manager.searchUsers(query)}
                            />
                        </>
                    )}
                </View>
            }
            ListEmptyComponent={
                !loading && !ranks.loading ? (
                    <Text style={copy}>{v.NO_DATA}</Text>
                ) : null
            }
            renderItem={({ item }) => (
                <View style={{ gap: theme.spacing.sm }}>
                    {(() => {
                        switch (item.kind) {
                            case "friend":
                            case "blocked": {
                                const user = item.value;
                                return (
                                    <>
                                        <MediaIdentity
                                            title={user.username}
                                            subtitle={
                                                user.nowPlaying ??
                                                (user.isOnline
                                                    ? v.FRIENDS_ONLINE
                                                    : v.FRIENDS_OFFLINE)
                                            }
                                            imageUrl={user.imageUrl}
                                            round
                                        />
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                flexWrap: "wrap",
                                                gap: theme.spacing.sm,
                                            }}
                                        >
                                            {item.kind === "blocked" ? (
                                                <ActionButton
                                                    label={v.FRIENDS_UNBLOCK}
                                                    onPress={() =>
                                                        void manager.unblockUser(
                                                            user.publicId
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <>
                                                    <ActionButton
                                                        label={v.FRIENDS_INVITE}
                                                        disabled={busy}
                                                        onPress={() => {
                                                            void listening.invite(
                                                                user.publicId
                                                            );
                                                            setTab("sessions");
                                                        }}
                                                    />
                                                    <ActionButton
                                                        label={v.FRIENDS_REMOVE}
                                                        destructive
                                                        onPress={() =>
                                                            void confirm(
                                                                v.FRIENDS_REMOVE,
                                                                () =>
                                                                    manager.removeFriend(
                                                                        user.publicId
                                                                    )
                                                            )
                                                        }
                                                    />
                                                    <ActionButton
                                                        label={v.FRIENDS_BLOCK}
                                                        destructive
                                                        onPress={() =>
                                                            void confirm(
                                                                v.FRIENDS_BLOCK,
                                                                () =>
                                                                    manager.blockUser(
                                                                        user.publicId
                                                                    )
                                                            )
                                                        }
                                                    />
                                                </>
                                            )}
                                        </View>
                                    </>
                                );
                            }
                            case "request":
                            case "pending": {
                                const request = item.value;
                                return (
                                    <>
                                        <MediaIdentity
                                            title={request.fromUsername}
                                            subtitle={
                                                request.message ??
                                                v.FRIENDS_PENDING
                                            }
                                            imageUrl={request.fromUserImageUrl}
                                            round
                                        />
                                        {item.kind === "request" && (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    gap: theme.spacing.sm,
                                                }}
                                            >
                                                <ActionButton
                                                    label={v.FRIENDS_ACCEPT}
                                                    onPress={() =>
                                                        void manager.acceptRequest(
                                                            request.publicId
                                                        )
                                                    }
                                                />
                                                <ActionButton
                                                    label={v.FRIENDS_DECLINE}
                                                    onPress={() =>
                                                        void manager.rejectRequest(
                                                            request.publicId
                                                        )
                                                    }
                                                />
                                            </View>
                                        )}
                                    </>
                                );
                            }
                            case "search": {
                                const user = item.value;
                                return (
                                    <>
                                        <MediaIdentity
                                            title={user.username}
                                            imageUrl={user.imageUrl}
                                            round
                                        />
                                        <ActionButton
                                            label={
                                                user.isFriend
                                                    ? v.FRIENDS_ALREADY_FRIENDS
                                                    : user.requestSent
                                                      ? v.FRIENDS_PENDING
                                                      : v.FRIENDS_ADD
                                            }
                                            disabled={
                                                user.isFriend ||
                                                user.requestSent
                                            }
                                            onPress={() =>
                                                void manager.sendRequest(
                                                    user.publicId
                                                )
                                            }
                                        />
                                    </>
                                );
                            }
                            case "activity":
                                return (
                                    <MediaIdentity
                                        title={item.value.mediaName}
                                        subtitle={item.value.username}
                                        imageUrl={item.value.mediaImageUrl}
                                    />
                                );
                            case "session": {
                                const session = item.value;
                                return (
                                    <>
                                        <MediaIdentity
                                            title={`${session.hostUsername} · ${session.guestUsername}`}
                                            subtitle={
                                                session.currentMediaName ??
                                                v.FRIENDS_PARTY
                                            }
                                            imageUrl={
                                                session.currentMediaImageUrl
                                            }
                                        />
                                        {session.status === "invited" && (
                                            <ActionButton
                                                label={v.FRIENDS_JOIN}
                                                disabled={busy}
                                                onPress={() =>
                                                    void listening.join(
                                                        session.publicId
                                                    )
                                                }
                                            />
                                        )}
                                        <ActionButton
                                            label={v.FRIENDS_LEAVE}
                                            disabled={busy}
                                            onPress={() =>
                                                void listening.leave(
                                                    session.publicId
                                                )
                                            }
                                        />
                                    </>
                                );
                            }
                            case "rank":
                                return (
                                    <MediaIdentity
                                        title={item.value.username}
                                        subtitle={`${item.value.level} · ${item.value.xp.toLocaleString()}`}
                                        imageUrl={item.value.imageUrl}
                                        round
                                    />
                                );
                            case "inbox":
                            case "sent": {
                                const share = item.value;
                                const collection = [
                                    "album",
                                    "playlist",
                                    "artist",
                                ].includes(share.mediaType);
                                return (
                                    <>
                                        <MediaIdentity
                                            title={share.mediaName}
                                            subtitle={(item.kind === "inbox"
                                                ? v.FRIENDS_SHARED_FROM
                                                : v.FRIENDS_SHARED_TO
                                            ).replace(
                                                "{name}",
                                                item.kind === "inbox"
                                                    ? share.senderUsername
                                                    : share.recipientUsername
                                            )}
                                            imageUrl={share.mediaImageUrl}
                                        />
                                        {share.message && (
                                            <Text style={copy}>
                                                {share.message}
                                            </Text>
                                        )}
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                gap: theme.spacing.sm,
                                            }}
                                        >
                                            <ActionButton
                                                label={
                                                    collection
                                                        ? v.FRIENDS_OPEN
                                                        : v.PLAY
                                                }
                                                onPress={() => {
                                                    if (
                                                        item.kind === "inbox" &&
                                                        !share.seen
                                                    )
                                                        void sharing.markAsSeen(
                                                            share.publicId
                                                        );
                                                    if (collection)
                                                        router.push(
                                                            `/(app)/${share.mediaType}/${share.mediaPublicId}`
                                                        );
                                                    else
                                                        void sharing.playSharedMedia(
                                                            share.mediaPublicId
                                                        );
                                                }}
                                            />
                                            <ActionButton
                                                label={v.DELETE}
                                                destructive
                                                onPress={() =>
                                                    void confirm(v.DELETE, () =>
                                                        sharing.deleteShare(
                                                            share.publicId
                                                        )
                                                    )
                                                }
                                            />
                                        </View>
                                    </>
                                );
                            }
                        }
                    })()}
                </View>
            )}
        />
    );
}
