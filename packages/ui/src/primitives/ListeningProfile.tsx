"use client";

import { useState, type ReactNode } from "react";
import type {
    ListeningBadgeResponse,
    UserLevelResponse,
    Vocabulary,
} from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import {
    Award,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Flame,
    Headphones,
} from "@rockit/ui/icons";
import { IconButton } from "@rockit/ui/primitives/IconButton";
import { ListeningEmblem } from "@rockit/ui/primitives/ListeningEmblem";
import { ProfileAvatar } from "@rockit/ui/primitives/ProfileAvatar";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** On-demand, scoped listening passport. No additional presence or playback subscriptions. */
export function ListeningProfile({
    loadProfile,
    resourceKey,
    vocabulary: v,
    renderEmblem,
    onOpenRecap,
    recapYear,
}: {
    loadProfile: () => Promise<UserLevelResponse | null>;
    resourceKey: string;
    onOpenRecap?: () => void;
    recapYear?: number;
    vocabulary: Vocabulary;
    renderEmblem?: (badge: ListeningBadgeResponse, size: number) => ReactNode;
}) {
    const theme = useDesignTheme();
    const resource = useAsyncResource(loadProfile, resourceKey);
    const [catalog, setCatalog] = useState(false);
    const [earnedOnly, setEarnedOnly] = useState(false);
    const [family, setFamily] = useState("all");
    const [league, setLeague] = useState("all");
    const [page, setPage] = useState(0);
    const [selectedKey, setSelectedKey] = useState<string>();
    const color = theme.colors.foreground;
    const muted = theme.colors["muted-foreground"];
    const text = (key: string, values: Record<string, string | number> = {}) =>
        Object.entries(values).reduce(
            (copy, [name, value]) =>
                copy.replaceAll(`{${name}}`, String(value)),
            (v as unknown as Record<string, string>)[key] ?? key
        );
    if (resource.loading)
        return (
            <View
                accessibilityLabel={v.MOBILE_LOADING}
                style={{ padding: theme.spacing.xl }}
            >
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    if (resource.error || !resource.data)
        return (
            <View accessibilityRole="alert" style={{ gap: theme.spacing.md }}>
                <Text style={{ color }}>{v.SOCIAL_ERROR}</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void resource.refresh()}
                    style={{
                        minHeight: theme.layout.touchTarget,
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: theme.colors.primary }}>
                        {v.SOCIAL_RETRY}
                    </Text>
                </Pressable>
            </View>
        );
    const profile = resource.data;
    const badges = [...profile.listeningBadges].sort(
        (a, b) =>
            Number(!!b.earnedAt) - Number(!!a.earnedAt) ||
            b.tier - a.tier ||
            a.key.localeCompare(b.key)
    );
    const earned = badges.filter((badge) => badge.earnedAt).length;
    const filtered = badges.filter(
        (badge) =>
            (!earnedOnly || badge.earnedAt) &&
            (family === "all" || badge.scope === family) &&
            (league === "all" || badge.league === league)
    );
    const size = theme.layout.socialEmblemSize;
    const pageSize = theme.layout.socialEmblemPageSize;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pages - 1);
    const shown = catalog
        ? filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
        : badges.slice(0, theme.layout.socialEmblemPreview);
    const selected =
        badges.find((badge) => badge.key === selectedKey) ?? shown[0];
    const progress =
        profile.xpToNext > 0
            ? Math.max(
                  0,
                  Math.min(
                      1,
                      (profile.xp - profile.levelStartXp) /
                          (profile.xp + profile.xpToNext - profile.levelStartXp)
                  )
              )
            : 1;
    const medal = (badge: ListeningBadgeResponse) =>
        renderEmblem?.(badge, size) ?? (
            <ListeningEmblem
                variant={badge.visualVariant}
                earned={!!badge.earnedAt}
                tier={badge.tier}
                league={badge.league}
                size={size}
            />
        );
    return (
        <View testID="listening-profile" style={{ gap: theme.spacing.xl }}>
            <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
                <ProfileAvatar
                    name={profile.username}
                    imageUrl={profile.imageUrl}
                    size={theme.layout.socialProfileAvatar}
                />
                <Text
                    accessibilityRole="header"
                    style={{
                        color: theme.colors["foreground-strong"],
                        fontSize: theme.typography.heading,
                        fontWeight: "600",
                        textAlign: "center",
                    }}
                >
                    {profile.username}
                </Text>
                <Text
                    style={{
                        color: theme.colors.primary,
                        fontSize: theme.typography.body,
                    }}
                >
                    {text("SOCIAL_LEVEL", { level: profile.level })}
                    {profile.title ? ` · ${text(profile.title)}` : ""}
                </Text>
                <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: Math.round(progress * 100),
                        text: text("SOCIAL_NEXT", { xp: profile.xpToNext }),
                    }}
                    accessibilityLabel={text("SOCIAL_LEVEL", {
                        level: profile.level,
                    })}
                    style={{
                        width: "100%",
                        height: theme.spacing.xs,
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.colors.secondary,
                        overflow: "hidden",
                        marginTop: theme.spacing.sm,
                    }}
                >
                    <View
                        style={{
                            width: `${progress * 100}%`,
                            height: "100%",
                            backgroundColor: theme.colors.primary,
                        }}
                    />
                </View>
                <Text
                    style={{ color: muted, fontSize: theme.typography.caption }}
                >
                    {profile.xpToNext > 0
                        ? text("SOCIAL_NEXT", {
                              xp: profile.xpToNext.toLocaleString(),
                          })
                        : v.SOCIAL_MAX}
                </Text>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: theme.spacing.lg,
                }}
            >
                {[
                    [
                        Clock3,
                        (profile.totalListeningSeconds / 3600).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 1 }
                        ),
                        v.SOCIAL_PROFILE_HOURS,
                    ],
                    [Award, String(earned), v.SOCIAL_PROFILE_BADGES],
                    [
                        Headphones,
                        profile.songsListened.toLocaleString(),
                        v.SOCIAL_LISTENS,
                    ],
                    [Flame, String(profile.streak), v.SOCIAL_STREAK],
                ].map(([Icon, value, label]) => {
                    const StatIcon = Icon as typeof Clock3;
                    return (
                        <View
                            key={String(label)}
                            style={{
                                width: "44%",
                                flexGrow: 1,
                                gap: theme.spacing.xs,
                            }}
                        >
                            <StatIcon
                                size={theme.typography.subtitle}
                                color={theme.colors.primary}
                            />
                            <Text
                                style={{
                                    color,
                                    fontSize: theme.typography.title,
                                    fontWeight: "600",
                                }}
                            >
                                {String(value)}
                            </Text>
                            <Text
                                style={{
                                    color: muted,
                                    fontSize: theme.typography.caption,
                                }}
                            >
                                {String(label)}
                            </Text>
                        </View>
                    );
                })}
            </View>
            {onOpenRecap && recapYear !== undefined && (
                <Pressable
                    accessibilityRole="button"
                    onPress={onOpenRecap}
                    style={{
                        minHeight: theme.layout.touchTarget,
                        borderRadius: theme.radius.full,
                        paddingHorizontal: theme.spacing.lg,
                        paddingVertical: theme.spacing.md,
                        backgroundColor: theme.colors.primary,
                        alignItems: "center",
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors["primary-foreground"],
                            fontSize: theme.typography.body,
                            fontWeight: "700",
                        }}
                    >
                        {v.RECAP_OPEN.replace("{year}", String(recapYear))}
                    </Text>
                </Pressable>
            )}
            <View style={{ gap: theme.spacing.md }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: theme.spacing.sm,
                    }}
                >
                    <Text
                        accessibilityRole="header"
                        style={{
                            color,
                            flexGrow: 1,
                            fontWeight: "600",
                            fontSize: theme.typography.subtitle,
                        }}
                    >
                        {v.FRIENDS_BADGES}
                    </Text>
                    <Text
                        style={{
                            color: muted,
                            fontSize: theme.typography.caption,
                        }}
                    >
                        {text("FRIENDS_BADGE_COUNT", {
                            count: earned,
                            total: badges.length,
                        })}
                    </Text>
                </View>
                {catalog && (
                    <View
                        style={{
                            flexDirection: "row",
                            gap: theme.spacing.sm,
                            flexWrap: "wrap",
                        }}
                    >
                        {[false, true].map((only) => (
                            <Pressable
                                key={String(only)}
                                accessibilityRole="button"
                                aria-pressed={earnedOnly === only}
                                accessibilityState={{
                                    selected: earnedOnly === only,
                                }}
                                onPress={() => {
                                    setEarnedOnly(only);
                                    setPage(0);
                                    setSelectedKey(undefined);
                                }}
                                style={{
                                    minHeight: theme.layout.touchTarget,
                                    paddingHorizontal: theme.spacing.md,
                                    justifyContent: "center",
                                    borderRadius: theme.radius.full,
                                    backgroundColor:
                                        earnedOnly === only
                                            ? theme.colors.secondary
                                            : "transparent",
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            earnedOnly === only ? color : muted,
                                    }}
                                >
                                    {only
                                        ? v.FRIENDS_BADGE_EARNED
                                        : v.FRIENDS_BADGE_ALL}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
                {catalog && (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            accessibilityLabel={v.FRIENDS_BADGE_FILTER_FAMILY}
                            style={{ flexGrow: 0 }}
                            contentContainerStyle={{ gap: theme.spacing.md }}
                        >
                            {[
                                "all",
                                ...new Set(badges.map((badge) => badge.scope)),
                            ].map((scope) => (
                                <Pressable
                                    key={scope}
                                    accessibilityRole="button"
                                    aria-pressed={family === scope}
                                    accessibilityState={{
                                        selected: family === scope,
                                    }}
                                    onPress={() => {
                                        setFamily(scope);
                                        setPage(0);
                                        setSelectedKey(undefined);
                                    }}
                                    style={{
                                        minHeight: theme.layout.touchTarget,
                                        justifyContent: "center",
                                        borderBottomWidth: 2,
                                        borderBottomColor:
                                            family === scope
                                                ? theme.colors.primary
                                                : "transparent",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                family === scope
                                                    ? color
                                                    : muted,
                                            fontSize: theme.typography.caption,
                                        }}
                                    >
                                        {scope === "all"
                                            ? v.FRIENDS_BADGE_ALL
                                            : text(
                                                  `FRIENDS_BADGE_FAMILY_${scope.toUpperCase()}`
                                              )}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            accessibilityLabel={v.FRIENDS_BADGE_FILTER_LEAGUE}
                            style={{ flexGrow: 0 }}
                            contentContainerStyle={{ gap: theme.spacing.md }}
                        >
                            {[
                                "all",
                                "bronze",
                                "silver",
                                "gold",
                                "platinum",
                                "diamond",
                                "legend",
                            ].map((rank) => (
                                <Pressable
                                    key={rank}
                                    accessibilityRole="button"
                                    aria-pressed={league === rank}
                                    accessibilityState={{
                                        selected: league === rank,
                                    }}
                                    onPress={() => {
                                        setLeague(rank);
                                        setPage(0);
                                        setSelectedKey(undefined);
                                    }}
                                    style={{
                                        minHeight: theme.layout.touchTarget,
                                        justifyContent: "center",
                                        borderBottomWidth: 2,
                                        borderBottomColor:
                                            league === rank
                                                ? theme.colors.primary
                                                : "transparent",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                league === rank ? color : muted,
                                            fontSize: theme.typography.caption,
                                        }}
                                    >
                                        {rank === "all"
                                            ? v.FRIENDS_BADGE_LEAGUES_ALL
                                            : text(
                                                  `FRIENDS_BADGE_LEAGUE_${rank.toUpperCase()}`
                                              )}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </>
                )}
                <View
                    testID="profile-emblems"
                    style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "space-around",
                        gap: theme.spacing.sm,
                    }}
                >
                    {shown.map((badge) => (
                        <Pressable
                            key={badge.key}
                            accessibilityRole="button"
                            accessibilityLabel={text(
                                "SOCIAL_PROFILE_BADGE_OPEN",
                                { name: text(badge.titleKey) }
                            )}
                            accessibilityState={{
                                selected: selected?.key === badge.key,
                            }}
                            aria-pressed={selected?.key === badge.key}
                            onPress={() => setSelectedKey(badge.key)}
                            style={{
                                alignItems: "center",
                                width: "29%",
                                gap: theme.spacing.xs,
                                paddingBottom: theme.spacing.sm,
                                borderBottomWidth: 2,
                                borderBottomColor:
                                    selected?.key === badge.key
                                        ? theme.colors.primary
                                        : "transparent",
                            }}
                        >
                            {medal(badge)}
                            <Text
                                numberOfLines={2}
                                style={{
                                    color: badge.earnedAt ? color : muted,
                                    fontSize: theme.typography.caption,
                                    textAlign: "center",
                                }}
                            >
                                {text(badge.titleKey)}
                            </Text>
                            <Text
                                style={{
                                    color: muted,
                                    fontSize: theme.typography.caption,
                                }}
                            >
                                {text(
                                    `FRIENDS_BADGE_LEAGUE_${badge.league.toUpperCase()}`
                                )}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                {shown.length === 0 && (
                    <Text style={{ color: muted }}>{v.NO_DATA}</Text>
                )}
                {selected && shown.length > 0 && (
                    <View
                        testID="profile-emblem-detail"
                        accessibilityLiveRegion="polite"
                        style={{ gap: theme.spacing.xs }}
                    >
                        <Text
                            style={{
                                color: muted,
                                fontSize: theme.typography.caption,
                            }}
                        >
                            {text(
                                `FRIENDS_BADGE_FAMILY_${selected.scope.toUpperCase()}`
                            )}{" "}
                            ·{" "}
                            {text(
                                `FRIENDS_BADGE_LEAGUE_${selected.league.toUpperCase()}`
                            )}
                        </Text>
                        <Text
                            style={{
                                color,
                                fontWeight: "600",
                                fontSize: theme.typography.body,
                            }}
                        >
                            {text(selected.titleKey)}
                        </Text>
                        <Text
                            style={{
                                color: muted,
                                fontSize: theme.typography.body,
                            }}
                        >
                            {text(selected.descriptionKey, {
                                target: selected.target,
                                minutes: selected.target,
                            })}
                        </Text>
                        <Text
                            style={{
                                color: selected.earnedAt
                                    ? theme.colors.success
                                    : muted,
                                fontSize: theme.typography.caption,
                            }}
                        >
                            {selected.earnedAt
                                ? `${v.FRIENDS_BADGE_EARNED} · ${new Date(selected.earnedAt).toLocaleDateString()}`
                                : selected.secret
                                  ? v.FRIENDS_BADGE_LOCKED
                                  : text("FRIENDS_BADGE_PROGRESS", {
                                        current: Math.min(
                                            selected.current,
                                            selected.target
                                        ),
                                        target: selected.target,
                                    })}
                        </Text>
                    </View>
                )}
                {catalog && pages > 1 && (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <IconButton
                            label={v.SOCIAL_PROFILE_PREVIOUS_PAGE}
                            disabled={currentPage === 0}
                            onPress={() => {
                                setPage(currentPage - 1);
                                setSelectedKey(undefined);
                            }}
                        >
                            <ChevronLeft color={color} />
                        </IconButton>
                        <Text
                            accessibilityLiveRegion="polite"
                            style={{ color: muted }}
                        >
                            {currentPage + 1} / {pages}
                        </Text>
                        <IconButton
                            label={v.SOCIAL_PROFILE_NEXT_PAGE}
                            disabled={currentPage === pages - 1}
                            onPress={() => {
                                setPage(currentPage + 1);
                                setSelectedKey(undefined);
                            }}
                        >
                            <ChevronRight color={color} />
                        </IconButton>
                    </View>
                )}
                <Pressable
                    accessibilityRole="button"
                    aria-expanded={catalog}
                    accessibilityState={{ expanded: catalog }}
                    onPress={() => {
                        setCatalog(!catalog);
                        setPage(0);
                        setSelectedKey(undefined);
                    }}
                    style={{
                        minHeight: theme.layout.touchTarget,
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            color: theme.colors.primary,
                            fontSize: theme.typography.body,
                        }}
                    >
                        {catalog
                            ? v.FRIENDS_BADGE_SHOW_FEWER
                            : text("FRIENDS_BADGE_SHOW_ALL", {
                                  count: badges.length,
                              })}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
