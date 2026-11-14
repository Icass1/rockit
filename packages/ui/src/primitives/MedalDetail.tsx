"use client";

import type { ReactNode } from "react";
import type { ListeningBadgeResponse, Vocabulary } from "@rockit/shared";
import {
    medalRarity,
    medalStory,
    medalTitle,
} from "@rockit/ui/headless/medalCopy";
import { Check, ChevronLeft, UsersRound } from "@rockit/ui/icons";
import { IconButton } from "@rockit/ui/primitives/IconButton";
import { ScrollView, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function MedalDetail({
    badge,
    ownerName,
    vocabulary: v,
    onBack,
    titleId,
    locale,
    children,
}: {
    badge: ListeningBadgeResponse;
    ownerName: string;
    vocabulary: Vocabulary;
    onBack: () => void;
    titleId?: string;
    locale?: string;
    children: ReactNode;
}) {
    const theme = useDesignTheme();
    const copy = (key: string) =>
        (v as unknown as Record<string, string>)[key] ?? key;
    const rarity = medalRarity(badge.holderPercentage, locale);
    const date = badge.earnedAt
        ? new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
          }).format(new Date(badge.earnedAt))
        : null;
    const progress = badge.secret
        ? v.FRIENDS_BADGE_LOCKED
        : v.FRIENDS_BADGE_PROGRESS.replace(
              "{current}",
              String(Math.min(badge.current, badge.target))
          ).replace("{target}", String(badge.target));
    return (
        <View
            testID="medal-profile-detail"
            style={{ flex: 1, minHeight: 0, gap: theme.spacing.md }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    flexShrink: 0,
                }}
            >
                <IconButton label={v.MEDAL_BACK_PROFILE} onPress={onBack}>
                    <ChevronLeft color={theme.colors.foreground} />
                </IconButton>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                        nativeID={titleId}
                        accessibilityRole="header"
                        style={{
                            color: theme.colors.foreground,
                            fontSize: theme.typography.subtitle,
                            fontWeight: "600",
                        }}
                    >
                        {v.FRIENDS_BADGES}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={{
                            color: theme.colors["muted-foreground"],
                            fontSize: theme.typography.caption,
                        }}
                    >
                        {ownerName}
                    </Text>
                </View>
            </View>
            <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
            <ScrollView
                testID="medal-details-copy"
                style={{
                    flexGrow: 0,
                    maxHeight: theme.layout.medalDetailsHeight,
                }}
                contentContainerStyle={{ gap: theme.spacing.sm }}
            >
                <Text
                    accessibilityRole="header"
                    style={{
                        color: theme.colors.foreground,
                        fontSize: theme.typography.subtitle,
                        fontWeight: "600",
                    }}
                >
                    {medalTitle(badge, v)}
                </Text>
                <Text
                    style={{
                        color: theme.colors["muted-foreground"],
                        fontSize: theme.typography.body,
                    }}
                >
                    {medalStory(badge, v, locale)}
                </Text>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: theme.spacing.sm,
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors["muted-foreground"],
                            fontSize: theme.typography.caption,
                        }}
                    >
                        {copy(
                            `FRIENDS_BADGE_LEAGUE_${badge.league.toUpperCase()}`
                        )}
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: theme.spacing.xs,
                            flexGrow: 1,
                        }}
                    >
                        {date && (
                            <Check
                                size={theme.typography.caption}
                                color={theme.colors.success}
                            />
                        )}
                        <Text
                            accessibilityLabel={
                                date
                                    ? `${v.FRIENDS_BADGE_EARNED} · ${date}`
                                    : progress
                            }
                            style={{
                                color: date
                                    ? theme.colors.success
                                    : theme.colors["muted-foreground"],
                                fontSize: theme.typography.caption,
                            }}
                        >
                            {date ?? progress}
                        </Text>
                    </View>
                    {rarity !== null && (
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: theme.spacing.xs,
                            }}
                        >
                            <UsersRound
                                size={theme.typography.caption}
                                color={theme.colors["muted-foreground"]}
                            />
                            <Text
                                testID="medal-rarity"
                                accessibilityLabel={v.MEDAL_RARITY.replace(
                                    "{percent}",
                                    rarity
                                )}
                                style={{
                                    color: theme.colors.foreground,
                                    fontSize: theme.typography.caption,
                                    fontWeight: "600",
                                }}
                            >
                                {rarity}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
