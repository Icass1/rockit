"use client";

import { ExplicitMark } from "@rockit/ui/icons";
import { View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** Render only persisted positive evidence; missing evidence is not clean. */
export function ExplicitBadge({
    explicit,
    label,
}: {
    explicit?: boolean | null;
    label: string;
}) {
    const theme = useDesignTheme();
    if (explicit !== true) return null;
    return (
        <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
            style={{
                backgroundColor: theme.colors["explicit-foreground"],
                width: theme.layout.explicitBadgeSize,
                height: theme.layout.explicitBadgeSize,
                borderRadius: theme.layout.explicitBadgeRadius,
                flexShrink: 0,
                alignSelf: "center",
            }}
        >
            <ExplicitMark
                size={theme.layout.explicitBadgeSize}
                fill={theme.colors["explicit-background"]}
                strokeWidth={0}
                aria-hidden={true}
            />
        </View>
    );
}
