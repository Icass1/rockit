"use client";

import { useState } from "react";
import type { Friend, Vocabulary } from "@rockit/shared";
import { withAlpha } from "@rockit/theme";
import { useListeningCircle } from "@rockit/ui/headless/useListeningCircle";
import { AudioLines, Headphones, UserPlus } from "@rockit/ui/icons";
import { ProfileAvatar } from "@rockit/ui/primitives/ProfileAvatar";
import { Pressable, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

type CircleCopy = Pick<
    Vocabulary,
    | "SOCIAL_CIRCLE_TITLE"
    | "SOCIAL_CIRCLE_HINT"
    | "SOCIAL_CIRCLE_EMPTY"
    | "SOCIAL_CIRCLE_SELECT"
    | "SOCIAL_CIRCLE_INVITE"
    | "FRIENDS_PARTY"
    | "FRIENDS_ONLINE"
    | "FRIENDS_OFFLINE"
    | "FRIENDS_ONLINE_COUNT"
    | "SOCIAL_MANAGE"
    | "SOCIAL_YOU"
    | "SOCIAL_PROFILE_OPEN"
    | "SOCIAL_PROFILE_SELF"
>;

/** One bounded, static listening stage shared by desktop, Expo and the PWA. */
export function ListeningCircle({
    friends,
    self,
    vocabulary: v,
    presentation = "default",
    busy = false,
    onInvite,
    onFindFriends,
    onViewProfile,
    onViewSelf,
}: {
    friends: readonly Friend[];
    self?: { username: string; image?: string | null };
    vocabulary: CircleCopy;
    presentation?: "default" | "desktop";
    busy?: boolean;
    onInvite: (publicId: string) => void;
    onFindFriends: () => void;
    onViewProfile?: (publicId: string) => void;
    onViewSelf?: () => void;
}) {
    const theme = useDesignTheme();
    const [width, setWidth] = useState(0);
    const desktop = presentation === "desktop";
    const wide = !desktop && width >= theme.layout.socialCircleWideBreakpoint;
    const inlineDetail = desktop && width >= 440;
    const { slots, selected, onlineCount, select } = useListeningCircle(
        friends,
        theme.layout.socialCircleLimit,
        theme.layout.socialCircleOrbitPercent
    );
    const avatar =
        desktop && width < 300
            ? theme.layout.touchTarget
            : theme.layout.socialCircleAvatar;
    const nodeWidth = avatar + theme.spacing.xl;
    const core = theme.layout.socialCircleCore;
    const track = selected?.isOnline ? selected.nowPlaying?.trim() : undefined;
    const status = selected?.isOnline ? v.FRIENDS_ONLINE : v.FRIENDS_OFFLINE;
    const focusColor = desktop
        ? theme.colors["social-tint"]
        : theme.colors.primary;
    const actionColor =
        desktop && selected
            ? theme.colors["foreground-strong"]
            : theme.colors["primary-foreground"];
    return (
        <View
            testID="listening-circle"
            onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
            style={{
                gap: desktop ? theme.spacing.md : theme.spacing.lg,
                paddingVertical: desktop ? 0 : theme.spacing.lg,
            }}
        >
            <View style={{ gap: theme.spacing.sm }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        flexWrap: "wrap",
                    }}
                >
                    <Text
                        accessibilityRole="header"
                        style={{
                            color: theme.colors["foreground-strong"],
                            fontSize: desktop
                                ? theme.typography.subtitle
                                : theme.typography.title,
                            fontWeight: "600",
                            flexGrow: 1,
                        }}
                    >
                        {v.SOCIAL_CIRCLE_TITLE}
                    </Text>
                    {friends.length > 0 && (!desktop || onlineCount > 0) && (
                        <Text
                            style={{
                                color: theme.colors.success,
                                fontSize: theme.typography.caption,
                            }}
                        >
                            {v.FRIENDS_ONLINE_COUNT.replace(
                                "{count}",
                                String(onlineCount)
                            )}
                        </Text>
                    )}
                </View>
                {(!desktop || !friends.length) && (
                    <Text
                        style={{
                            color: theme.colors["muted-foreground"],
                            fontSize: theme.typography.body,
                        }}
                    >
                        {friends.length
                            ? v.SOCIAL_CIRCLE_HINT
                            : v.SOCIAL_CIRCLE_EMPTY}
                    </Text>
                )}
            </View>
            <View
                style={{
                    flexDirection: wide ? "row" : "column",
                    alignItems: wide ? "center" : "stretch",
                    justifyContent: "center",
                    gap: desktop ? theme.spacing.sm : theme.spacing.xl,
                }}
            >
                <View
                    testID="listening-circle-stage"
                    style={[
                        {
                            width: wide ? "55%" : "100%",
                            maxWidth: theme.layout.socialCircleMaxWidth,
                            alignSelf: "center",
                        },
                        desktop
                            ? {
                                  maxWidth: friends.length ? 336 : 144,
                                  aspectRatio: 1,
                              }
                            : { height: theme.layout.socialCircleHeight },
                    ]}
                >
                    {(desktop ? [4, 10, 16, 22, 29] : [8, 16, 24]).map(
                        (inset, ring) => (
                            <View
                                key={inset}
                                accessible={false}
                                importantForAccessibility="no-hide-descendants"
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    left: `${inset}%`,
                                    right: `${inset}%`,
                                    top: `${inset}%`,
                                    bottom: `${inset}%`,
                                    borderRadius: theme.radius.full,
                                    borderWidth: 1,
                                    borderColor: desktop
                                        ? withAlpha(
                                              theme.colors["foreground-strong"],
                                              ring === 2 ? 0.19 : 0.09
                                          )
                                        : withAlpha(
                                              theme.colors.primary,
                                              0.12 - ring * 0.03
                                          ),
                                    backgroundColor:
                                        desktop && ring === 0
                                            ? theme.colors.background
                                            : undefined,
                                }}
                            />
                        )
                    )}
                    <View
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            marginLeft: -core / 2,
                            marginTop: -core / 2,
                            width: core,
                            height: core,
                            borderRadius: theme.radius.full,
                            backgroundColor: desktop
                                ? theme.colors.surface
                                : withAlpha(theme.colors.primary, 0.08),
                            borderWidth: 1,
                            borderColor: withAlpha(focusColor, 0.24),
                            alignItems: "center",
                            justifyContent: "center",
                            gap: theme.spacing.xs,
                        }}
                    >
                        {self ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={v.SOCIAL_PROFILE_SELF}
                                disabled={!onViewSelf}
                                onPress={onViewSelf}
                            >
                                <ProfileAvatar
                                    name={self.username}
                                    imageUrl={self.image}
                                    size={avatar}
                                    neutral={desktop}
                                />
                            </Pressable>
                        ) : (
                            <Headphones
                                size={theme.typography.heading}
                                color={theme.colors.primary}
                            />
                        )}
                        <Text
                            style={{
                                color: theme.colors["muted-foreground"],
                                fontSize: theme.typography.caption,
                            }}
                        >
                            {v.SOCIAL_YOU}
                        </Text>
                    </View>
                    {slots.map(({ friend, x, y }) => (
                        <Pressable
                            key={friend.publicId}
                            testID={`listening-circle-person-${friend.publicId}`}
                            accessibilityRole="button"
                            accessibilityLabel={(onViewProfile
                                ? v.SOCIAL_PROFILE_OPEN
                                : v.SOCIAL_CIRCLE_SELECT
                            ).replace("{name}", friend.username)}
                            accessibilityState={{
                                selected:
                                    selected?.publicId === friend.publicId,
                            }}
                            aria-pressed={
                                onViewProfile
                                    ? undefined
                                    : selected?.publicId === friend.publicId
                            }
                            onPress={() => {
                                select(friend.publicId);
                                onViewProfile?.(friend.publicId);
                            }}
                            style={({ pressed }) => ({
                                position: "absolute",
                                left: `${x}%`,
                                top: `${y}%`,
                                marginLeft: -nodeWidth / 2,
                                marginTop: desktop
                                    ? -avatar / 2 - theme.spacing.xs - 2
                                    : -avatar / 2,
                                width: nodeWidth,
                                borderRadius: theme.radius.md,
                                alignItems: "center",
                                gap: theme.spacing.xs,
                                opacity: pressed ? 0.75 : 1,
                            })}
                        >
                            <View
                                style={{
                                    padding: theme.spacing.xs,
                                    borderWidth: 2,
                                    borderRadius: theme.radius.full,
                                    borderColor:
                                        selected?.publicId === friend.publicId
                                            ? focusColor
                                            : theme.colors["border-subtle"],
                                    backgroundColor: theme.colors.background,
                                }}
                            >
                                <ProfileAvatar
                                    name={friend.username}
                                    imageUrl={friend.imageUrl}
                                    size={avatar}
                                    neutral={desktop}
                                />
                                <View
                                    style={{
                                        position: "absolute",
                                        right: theme.spacing.xs,
                                        bottom: theme.spacing.xs,
                                        width: theme.spacing.sm,
                                        height: theme.spacing.sm,
                                        borderRadius: theme.radius.full,
                                        backgroundColor: friend.isOnline
                                            ? theme.colors.success
                                            : desktop
                                              ? theme.colors[
                                                    "disabled-foreground"
                                                ]
                                              : theme.colors[
                                                    "muted-foreground"
                                                ],
                                        borderWidth: 1,
                                        borderColor: theme.colors.background,
                                    }}
                                />
                            </View>
                            <Text
                                numberOfLines={1}
                                style={{
                                    color:
                                        selected?.publicId === friend.publicId
                                            ? theme.colors["foreground-strong"]
                                            : theme.colors["muted-foreground"],
                                    fontSize: theme.typography.caption,
                                    textAlign: "center",
                                    maxWidth: "100%",
                                }}
                            >
                                {friend.username}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <View
                    testID="listening-circle-detail"
                    accessibilityLiveRegion="polite"
                    style={{
                        flex: wide ? 1 : undefined,
                        minWidth: 0,
                        maxWidth: wide
                            ? theme.layout.socialCircleMaxWidth
                            : undefined,
                        gap: theme.spacing.md,
                        paddingHorizontal: desktop ? 0 : theme.spacing.sm,
                        flexDirection: inlineDetail ? "row" : "column",
                        alignItems: inlineDetail ? "center" : "stretch",
                        borderTopWidth: desktop ? 1 : 0,
                        borderTopColor: theme.colors["border-subtle"],
                        paddingTop: desktop ? theme.spacing.md : 0,
                    }}
                >
                    {selected && (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: theme.spacing.md,
                                flex: inlineDetail ? 1 : undefined,
                                minWidth: 0,
                            }}
                        >
                            {track ? (
                                <AudioLines
                                    size={theme.typography.title}
                                    color={focusColor}
                                />
                            ) : (
                                <Headphones
                                    size={theme.typography.title}
                                    color={theme.colors["muted-foreground"]}
                                />
                            )}
                            <View style={{ flex: 1, gap: theme.spacing.xs }}>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        fontSize: wide
                                            ? theme.typography.heading
                                            : theme.typography.subtitle,
                                        color: theme.colors[
                                            "foreground-strong"
                                        ],
                                        fontWeight: "600",
                                    }}
                                >
                                    {selected.username}
                                </Text>
                                <Text
                                    numberOfLines={2}
                                    style={{
                                        fontSize: theme.typography.body,
                                        color: theme.colors["muted-foreground"],
                                    }}
                                >
                                    {track || status}
                                </Text>
                            </View>
                        </View>
                    )}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            selected
                                ? v.SOCIAL_CIRCLE_INVITE.replace(
                                      "{name}",
                                      selected.username
                                  )
                                : v.SOCIAL_MANAGE
                        }
                        disabled={!!selected && busy}
                        accessibilityState={{ disabled: !!selected && busy }}
                        onPress={() =>
                            selected
                                ? onInvite(selected.publicId)
                                : onFindFriends()
                        }
                        style={({ pressed }) => ({
                            minHeight: theme.layout.touchTarget,
                            borderRadius: desktop
                                ? theme.radius.md
                                : theme.radius.full,
                            backgroundColor:
                                desktop && selected
                                    ? theme.colors["surface-raised"]
                                    : theme.colors.primary,
                            paddingHorizontal: theme.spacing.lg,
                            paddingVertical: theme.spacing.sm,
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: theme.spacing.sm,
                            opacity: selected && busy ? 0.5 : pressed ? 0.8 : 1,
                        })}
                    >
                        {selected ? (
                            <Headphones
                                size={theme.typography.subtitle}
                                color={actionColor}
                            />
                        ) : (
                            <UserPlus
                                size={theme.typography.subtitle}
                                color={actionColor}
                            />
                        )}
                        <Text
                            style={{
                                color: actionColor,
                                fontWeight: "600",
                                fontSize: theme.typography.body,
                            }}
                        >
                            {selected ? v.FRIENDS_PARTY : v.SOCIAL_MANAGE}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
