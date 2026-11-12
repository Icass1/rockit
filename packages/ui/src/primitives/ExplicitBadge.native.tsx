"use client";

import { Text } from "@rockit/ui/runtime";
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
        <Text
            accessibilityLabel={label}
            style={{
                color: theme.colors["explicit-foreground"],
                backgroundColor: theme.colors["explicit-background"],
                textAlign: "center",
                minWidth: theme.typography.caption + theme.spacing.xs,
                borderRadius: theme.radius.xs,
                paddingHorizontal: theme.spacing.xs,
                fontSize: theme.typography.caption,
                fontWeight: "700",
                flexShrink: 0,
                alignSelf: "flex-start",
            }}
        >
            E
        </Text>
    );
}
