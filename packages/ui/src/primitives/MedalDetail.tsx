"use client";

import type { ReactNode } from "react";
import type { ListeningBadgeResponse, Vocabulary } from "@rockit/shared";
import { ChevronLeft } from "@rockit/ui/icons";
import { IconButton } from "@rockit/ui/primitives/IconButton";
import { ScrollView, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** One profile-detail composition; the host supplies its browser or native stage. */
export function MedalDetail({
    badge,
    ownerName,
    vocabulary: v,
    onBack,
    titleId,
    children,
}: {
    badge: ListeningBadgeResponse;
    ownerName: string;
    vocabulary: Vocabulary;
    onBack: () => void;
    titleId?: string;
    children: ReactNode;
}) {
    const theme = useDesignTheme();
    const copy = (key: string) =>
        (v as unknown as Record<string, string>)[key] ?? key;
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
                contentContainerStyle={{ gap: theme.spacing.xs }}
            >
                <Text
                    style={{
                        color: theme.colors["muted-foreground"],
                        fontSize: theme.typography.caption,
                    }}
                >
                    {copy(`FRIENDS_BADGE_FAMILY_${badge.scope.toUpperCase()}`)}{" "}
                    ·{" "}
                    {copy(`FRIENDS_BADGE_LEAGUE_${badge.league.toUpperCase()}`)}
                </Text>
                <Text
                    style={{
                        color: theme.colors.foreground,
                        fontSize: theme.typography.subtitle,
                        fontWeight: "600",
                    }}
                >
                    {copy(badge.titleKey)}
                </Text>
                <Text
                    style={{
                        color: theme.colors["muted-foreground"],
                        fontSize: theme.typography.body,
                    }}
                >
                    {copy(badge.descriptionKey)
                        .replaceAll("{target}", String(badge.target))
                        .replaceAll("{minutes}", String(badge.target))}
                </Text>
                <Text
                    style={{
                        color: badge.earnedAt
                            ? theme.colors.success
                            : theme.colors["muted-foreground"],
                        fontSize: theme.typography.caption,
                    }}
                >
                    {badge.earnedAt
                        ? `${v.FRIENDS_BADGE_EARNED} · ${new Date(badge.earnedAt).toLocaleDateString()}`
                        : badge.secret
                          ? v.FRIENDS_BADGE_LOCKED
                          : v.FRIENDS_BADGE_PROGRESS.replace(
                                "{current}",
                                String(Math.min(badge.current, badge.target))
                            ).replace("{target}", String(badge.target))}
                </Text>
            </ScrollView>
        </View>
    );
}
