"use client";

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
}: {
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    imageLabel?: string;
    fallbackUri?: string;
    round?: boolean;
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
                <Text
                    numberOfLines={1}
                    style={{
                        color: theme.colors["foreground-strong"],
                        fontSize: theme.typography.body,
                        fontWeight: "500",
                    }}
                >
                    {title}
                </Text>
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
