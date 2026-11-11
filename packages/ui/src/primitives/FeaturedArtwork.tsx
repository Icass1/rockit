"use client";

import { featuredArtworkSource } from "@rockit/ui/featuredAssets";
import {
    CalendarDays,
    Disc3,
    Download,
    Heart,
    History,
} from "@rockit/ui/icons";
import { Image, Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** Official RockIt artwork, bundled on native and hosted locally on each web origin. */
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
              : kind === "latest-downloads"
                ? Download
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
            <Image
                source={featuredArtworkSource(kind)}
                resizeMode="cover"
                style={{ position: "absolute", width: length, height: length }}
            />
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {kind === "year-recap" ? (
                    <Text
                        style={{
                            color: theme.colors["on-media"],
                            fontSize: length * 0.23,
                            fontWeight: "700",
                        }}
                    >
                        {new Date().getFullYear() - 1}
                    </Text>
                ) : kind !== "last-month" ? (
                    <Icon
                        color={theme.colors["on-media"]}
                        size={length * 0.45}
                        fill={
                            kind === "liked" ? theme.colors["on-media"] : "none"
                        }
                    />
                ) : null}
            </View>
        </View>
    );
}
