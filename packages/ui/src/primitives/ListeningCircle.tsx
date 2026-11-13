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
>;

/** One bounded, static listening stage shared by desktop, Expo and the PWA. */
export function ListeningCircle({
    friends,
    self,
    vocabulary: v,
    busy = false,
    onInvite,
    onFindFriends,
}: {
    friends: readonly Friend[];
    self?: { username: string; image?: string | null };
    vocabulary: CircleCopy;
    busy?: boolean;
    onInvite: (publicId: string) => void;
    onFindFriends: () => void;
}) {
    const theme = useDesignTheme();
    const [width, setWidth] = useState(0);
    const wide = width >= theme.layout.socialCircleWideBreakpoint;
    const { slots, selected, onlineCount, select } = useListeningCircle(
        friends,
        theme.layout.socialCircleLimit,
        theme.layout.socialCircleOrbitPercent
    );
    const avatar = theme.layout.socialCircleAvatar;
    const nodeWidth = avatar + theme.spacing.xl;
    const core = theme.layout.socialCircleCore;
    const track = selected?.isOnline ? selected.nowPlaying?.trim() : undefined;
    const status = selected?.isOnline ? v.FRIENDS_ONLINE : v.FRIENDS_OFFLINE;
    return (
        <View
            testID="listening-circle"
            onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
            style={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}
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
                            fontSize: theme.typography.title,
                            fontWeight: "600",
                            flexGrow: 1,
                        }}
                    >
                        {v.SOCIAL_CIRCLE_TITLE}
                    </Text>
                    {friends.length > 0 && (
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
            </View>
            <View
                style={{
                    flexDirection: wide ? "row" : "column",
                    alignItems: wide ? "center" : "stretch",
                    justifyContent: "center",
                    gap: theme.spacing.xl,
                }}
            >
                <View
                    testID="listening-circle-stage"
                    style={{
                        height: theme.layout.socialCircleHeight,
                        width: wide ? "55%" : "100%",
                        maxWidth: theme.layout.socialCircleMaxWidth,
                        alignSelf: "center",
                    }}
                >
                    {[0, 1, 2].map((ring) => (
                        <View
                            key={ring}
                            accessible={false}
                            importantForAccessibility="no-hide-descendants"
                            style={{
                                position: "absolute",
                                left: `${theme.spacing.sm + ring * theme.spacing.sm}%`,
                                right: `${theme.spacing.sm + ring * theme.spacing.sm}%`,
                                top: `${theme.spacing.sm + ring * theme.spacing.sm}%`,
                                bottom: `${theme.spacing.sm + ring * theme.spacing.sm}%`,
                                borderRadius: theme.radius.full,
                                borderWidth: 1,
                                borderColor: withAlpha(
                                    theme.colors.primary,
                                    0.12 - ring * 0.03
                                ),
                            }}
                        />
                    ))}
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
                            backgroundColor: withAlpha(
                                theme.colors.primary,
                                0.08
                            ),
                            borderWidth: 1,
                            borderColor: withAlpha(theme.colors.primary, 0.2),
                            alignItems: "center",
                            justifyContent: "center",
                            gap: theme.spacing.xs,
                        }}
                    >
                        {self ? (
                            <ProfileAvatar
                                name={self.username}
                                imageUrl={self.image}
                                size={avatar}
                            />
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
                            accessibilityLabel={v.SOCIAL_CIRCLE_SELECT.replace(
                                "{name}",
                                friend.username
                            )}
                            accessibilityState={{
                                selected:
                                    selected?.publicId === friend.publicId,
                            }}
                            aria-pressed={
                                selected?.publicId === friend.publicId
                            }
                            onPress={() => select(friend.publicId)}
                            style={({ pressed }) => ({
                                position: "absolute",
                                left: `${x}%`,
                                top: `${y}%`,
                                marginLeft: -nodeWidth / 2,
                                marginTop: -avatar / 2,
                                width: nodeWidth,
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
                                            ? theme.colors.primary
                                            : theme.colors["border-subtle"],
                                    backgroundColor: theme.colors.background,
                                }}
                            >
                                <ProfileAvatar
                                    name={friend.username}
                                    imageUrl={friend.imageUrl}
                                    size={avatar}
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
                                            : theme.colors["muted-foreground"],
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
                        paddingHorizontal: theme.spacing.sm,
                    }}
                >
                    {selected && (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: theme.spacing.md,
                            }}
                        >
                            {track ? (
                                <AudioLines
                                    size={theme.typography.title}
                                    color={theme.colors.primary}
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
                            borderRadius: theme.radius.full,
                            backgroundColor: theme.colors.primary,
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
                                color={theme.colors["primary-foreground"]}
                            />
                        ) : (
                            <UserPlus
                                size={theme.typography.subtitle}
                                color={theme.colors["primary-foreground"]}
                            />
                        )}
                        <Text
                            style={{
                                color: theme.colors["primary-foreground"],
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
