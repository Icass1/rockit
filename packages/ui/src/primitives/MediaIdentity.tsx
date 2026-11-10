"use client";

import { ExplicitBadge } from "@rockit/ui/primitives/ExplicitBadge";
import { MediaArtwork } from "@rockit/ui/primitives/MediaArtwork";
import { Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function MediaIdentity({
    title,
    subtitle = "",
    imageUrl,
    imageLabel,
    fallbackUri,
    round = false,
    explicit,
    explicitLabel,
}: {
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    imageLabel?: string;
    fallbackUri?: string;
    round?: boolean;
    explicit?: boolean | null;
    explicitLabel?: string;
}) {
    const theme = useDesignTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.md,
                minWidth: 0,
                flex: 1,
            }}
        >
            <MediaArtwork
                uri={imageUrl}
                fallbackUri={fallbackUri}
                label={imageLabel ?? title}
                round={round}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: theme.spacing.xs,
                    }}
                >
                    <Text
                        numberOfLines={1}
                        style={{
                            color: theme.colors["foreground-strong"],
                            fontSize: theme.typography.body,
                            fontWeight: "500",
                            flexShrink: 1,
                        }}
                    >
                        {title}
                    </Text>
                    {explicitLabel && (
                        <ExplicitBadge
                            explicit={explicit}
                            label={explicitLabel}
                        />
                    )}
                </View>
                <Text
                    numberOfLines={1}
                    style={{
                        color: theme.colors["muted-foreground"],
                        fontSize: theme.typography.caption,
                    }}
                >
                    {subtitle}
                </Text>
            </View>
        </View>
    );
}
