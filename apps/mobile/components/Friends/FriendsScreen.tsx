import { useCallback, useState } from "react";
import { confirmAction } from "@/platform/confirmAction";
import { useStore } from "@nanostores/react";
import {
    ActionButton,
    IconButton,
    ListeningCircle,
    MediaIdentity,
    useDesignTheme,
} from "@rockit/ui";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import {
    Activity,
    Ban,
    Headphones,
    Inbox,
    MoreHorizontal,
    Search,
    Send,
    Trophy,
    UserMinus,
    UserPlus,
    Users,
} from "@rockit/ui/icons";
import { useFocusEffect } from "expo-router";
import {
    FlatList,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import type {
    MobileSocialRow,
    MobileSocialTab,
} from "@/models/interfaces/socialTab";
import { useContextMenu } from "@/lib/ContextMenuContext";
import { usePlayerServices } from "@/lib/PlayerContext";
import { useTypedRouter } from "@/lib/useTypedRouter";
import { useVocabulary } from "@/lib/vocabulary";
import ListeningProfileModal from "@/components/Friends/ListeningProfileModal";

export default function FriendsScreen() {
    const theme = useDesignTheme();
    const menu = useContextMenu();
    const { vocabulary: v } = useVocabulary();
    const services = usePlayerServices();
    const manager = services.friendManager;
    const listening = services.listenTogetherManager;
    const sharing = services.sharingManager;
    const router = useTypedRouter();
    const friends = useStore(manager.friendsAtom);
    const session = useStore(services.userManager.sessionAtom);
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
    const [profile, setProfile] = useState<{
        scope: number;
        publicId?: string;
        name: string;
    } | null>(null);
    const openProfile = (publicId: string) => {
        const friend = friends.find((person) => person.publicId === publicId);
        if (friend) setProfile({ scope, publicId, name: friend.username });
    };
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
        { key: "friends", label: v.FRIENDS_LIST, icon: Users },
        { key: "requests", label: v.FRIENDS_FRIEND_REQUESTS, icon: UserPlus },
        { key: "activity", label: v.FRIENDS_ACTIVITY, icon: Activity },
        { key: "sessions", label: v.FRIENDS_PARTY, icon: Headphones },
    ] as const;
    const moreTabs = [
        { key: "leaderboard", label: v.FRIENDS_LEADERBOARD, icon: Trophy },
        { key: "inbox", label: v.FRIENDS_SHARE_RECEIVED, icon: Inbox },
        { key: "sent", label: v.FRIENDS_SHARE_SENT, icon: Send },
        { key: "blocked", label: v.FRIENDS_BLOCKED, icon: Ban },
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
        if (await confirmAction(label, label, label, v.CANCEL)) await action();
    };
    const list = (
        <FlatList
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            data={rows}
            keyExtractor={(item) =>
                `${item.kind}:${"publicId" in item.value ? item.value.publicId : "userId" in item.value ? item.value.userId : `${item.value.userPublicId}:${item.value.listenedAt}`}`
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            contentContainerStyle={{
                paddingTop: theme.layout.mobileContentTop,
                paddingBottom: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.lg,
            }}
            ListHeaderComponent={
                <View style={{ gap: theme.spacing.lg }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: theme.spacing.sm,
                        }}
                    >
                        <Text
                            style={{
                                ...copy,
                                fontSize: theme.typography.heading,
                                flex: 1,
                            }}
                        >
                            {v.FRIENDS}
                        </Text>
                        <IconButton
                            label={v.FRIENDS_SEARCH_PLACEHOLDER}
                            onPress={() => setTab("search")}
                        >
                            <UserPlus color={theme.colors.foreground} />
                        </IconButton>
                        <IconButton
                            label={v.PIP_OPTIONS}
                            onPress={() =>
                                menu.show({
                                    title: v.FRIENDS,
                                    options: moreTabs.map((item) => ({
                                        label: item.label,
                                        icon: item.icon,
                                        onPress: () => {
                                            menu.hide();
                                            setTab(item.key);
                                        },
                                    })),
                                })
                            }
                        >
                            <MoreHorizontal color={theme.colors.foreground} />
                        </IconButton>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0, flexShrink: 0 }}
                        contentContainerStyle={{ gap: theme.spacing.sm }}
                    >
                        {tabs.map((item) => (
                            <Pressable
                                key={item.key}
                                accessibilityRole="tab"
                                accessibilityLabel={item.label}
                                aria-selected={tab === item.key}
                                accessibilityState={{
                                    selected: tab === item.key,
                                }}
                                onPress={() => setTab(item.key)}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    paddingHorizontal: theme.spacing.sm,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: theme.spacing.xs,
                                    borderBottomWidth: tab === item.key ? 2 : 0,
                                    borderBottomColor: theme.colors.primary,
                                }}
                            >
                                <item.icon
                                    size={theme.typography.title}
                                    color={
                                        tab === item.key
                                            ? theme.colors.primary
                                            : theme.colors["muted-foreground"]
                                    }
                                />
                                {tab === item.key && (
                                    <Text
                                        style={{
                                            ...copy,
                                            fontSize: theme.typography.caption,
                                        }}
                                    >
                                        {item.label}
                                    </Text>
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>
                    {tab === "friends" &&
                        ((!loading && !error) || friends.length > 0) && (
                            <ListeningCircle
                                key={scope}
                                friends={friends}
                                self={session ?? undefined}
                                vocabulary={v}
                                onViewProfile={openProfile}
                                onViewSelf={() =>
                                    setProfile({
                                        scope,
                                        name: session?.username ?? v.SOCIAL_YOU,
                                    })
                                }
                                busy={busy}
                                onInvite={(publicId) => {
                                    void listening
                                        .invite(publicId)
                                        .then((ok) => {
                                            if (
                                                ok &&
                                                manager.scopeAtom.get() ===
                                                    scope
                                            )
                                                setTab("sessions");
                                        });
                                }}
                                onFindFriends={() => setTab("search")}
                            />
                        )}
                    {!tabs.some((item) => item.key === tab) && (
                        <Text style={copy}>
                            {tab === "search"
                                ? v.SEARCH
                                : moreTabs.find((item) => item.key === tab)
                                      ?.label}
                        </Text>
                    )}
                    {(loading || ranks.loading) && (
                        <Text style={copy}>{v.MOBILE_LOADING}</Text>
                    )}
                    {(error || ranks.error) && (
                        <Text
                            accessibilityRole="alert"
                            style={{
                                ...copy,
                                color: theme.colors.destructive,
                            }}
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
                                placeholderTextColor={
                                    theme.colors["muted-foreground"]
                                }
                                autoFocus
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
                            <IconButton
                                label={v.SEARCH}
                                onPress={() => void manager.searchUsers(query)}
                            >
                                <Search color={theme.colors.primary} />
                            </IconButton>
                        </>
                    )}
                </View>
            }
            ListEmptyComponent={
                tab !== "friends" && !loading && !ranks.loading ? (
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
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: theme.spacing.sm,
                                            paddingVertical: theme.spacing.sm,
                                        }}
                                    >
                                        <Pressable
                                            style={{ flex: 1 }}
                                            disabled={item.kind === "blocked"}
                                            accessibilityRole="button"
                                            accessibilityLabel={v.SOCIAL_PROFILE_OPEN.replace(
                                                "{name}",
                                                user.username
                                            )}
                                            onPress={() =>
                                                openProfile(user.publicId)
                                            }
                                        >
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
                                            {user.levelTitle && (
                                                <Text
                                                    style={{
                                                        color: theme.colors[
                                                            "muted-foreground"
                                                        ],
                                                        fontSize:
                                                            theme.typography
                                                                .caption,
                                                    }}
                                                >
                                                    {user.level} ·{" "}
                                                    {user.levelTitle}
                                                </Text>
                                            )}
                                        </Pressable>
                                        {item.kind === "blocked" ? (
                                            <IconButton
                                                label={v.FRIENDS_UNBLOCK}
                                                onPress={() =>
                                                    void manager.unblockUser(
                                                        user.publicId
                                                    )
                                                }
                                            >
                                                <UserPlus
                                                    color={theme.colors.primary}
                                                />
                                            </IconButton>
                                        ) : (
                                            <>
                                                <IconButton
                                                    label={v.FRIENDS_INVITE}
                                                    disabled={busy}
                                                    onPress={() => {
                                                        void listening.invite(
                                                            user.publicId
                                                        );
                                                        setTab("sessions");
                                                    }}
                                                >
                                                    <Headphones
                                                        color={
                                                            theme.colors.primary
                                                        }
                                                    />
                                                </IconButton>
                                                <IconButton
                                                    label={v.PIP_OPTIONS}
                                                    onPress={() =>
                                                        menu.show({
                                                            title: user.username,
                                                            imageUrl:
                                                                user.imageUrl ??
                                                                undefined,
                                                            options: [
                                                                {
                                                                    label: v.FRIENDS_REMOVE,
                                                                    icon: UserMinus,
                                                                    destructive: true,
                                                                    onPress:
                                                                        () => {
                                                                            menu.hide();
                                                                            void confirm(
                                                                                v.FRIENDS_REMOVE,
                                                                                () =>
                                                                                    manager.removeFriend(
                                                                                        user.publicId
                                                                                    )
                                                                            );
                                                                        },
                                                                },
                                                                {
                                                                    label: v.FRIENDS_BLOCK,
                                                                    icon: Ban,
                                                                    destructive: true,
                                                                    onPress:
                                                                        () => {
                                                                            menu.hide();
                                                                            void confirm(
                                                                                v.FRIENDS_BLOCK,
                                                                                () =>
                                                                                    manager.blockUser(
                                                                                        user.publicId
                                                                                    )
                                                                            );
                                                                        },
                                                                },
                                                            ],
                                                        })
                                                    }
                                                >
                                                    <MoreHorizontal
                                                        color={
                                                            theme.colors[
                                                                "muted-foreground"
                                                            ]
                                                        }
                                                    />
                                                </IconButton>
                                            </>
                                        )}
                                    </View>
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
    return (
        <>
            {list}
            <ListeningProfileModal
                key={`${scope}:${profile ? (profile.publicId ?? "self") : "closed"}`}
                target={profile?.scope === scope ? profile : null}
                onClose={() => setProfile(null)}
            />
        </>
    );
}
