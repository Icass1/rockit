"use client";

import { withAlpha } from "@rockit/theme";
import { CalendarDays, Disc3, Heart, History } from "@rockit/ui/icons";
import { Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** Procedural artwork is available on every origin and offline, without image URLs. */
export function FeaturedArtwork({
    kind,
    label,
    size,
}: {
    kind: string;
    label: string;
    size?: number;
}) {
    const theme = useDesignTheme();
    const length = size ?? theme.layout.artistArtwork;
    const Icon =
        kind === "liked"
            ? Heart
            : kind === "recent-mix"
              ? History
              : kind === "most-listened"
                ? Disc3
                : CalendarDays;
    return (
        <View
            accessibilityRole="image"
            accessibilityLabel={label}
            style={{
                width: length,
                height: length,
                overflow: "hidden",
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.secondary,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <View
                style={{
                    position: "absolute",
                    width: length * 1.5,
                    height: length * 1.5,
                    borderRadius: length,
                    backgroundColor: withAlpha(theme.colors.primary, 0.35),
                    left: -length * 0.65,
                    top: -length * 0.45,
                }}
            />
            <View
                style={{
                    position: "absolute",
                    width: length,
                    height: length,
                    borderRadius: length,
                    backgroundColor: withAlpha(
                        theme.colors["brand-light"],
                        0.3
                    ),
                    right: -length * 0.45,
                    bottom: -length * 0.5,
                }}
            />
            {kind === "year-recap" ? (
                <Text
                    style={{
                        color: theme.colors.foreground,
                        fontSize: length * 0.23,
                        fontWeight: "700",
                    }}
                >
                    {new Date().getFullYear() - 1}
                </Text>
            ) : (
                <Icon
                    color={theme.colors.foreground}
                    size={length * 0.45}
                    fill={kind === "liked" ? theme.colors.foreground : "none"}
                />
            )}
        </View>
    );
}
