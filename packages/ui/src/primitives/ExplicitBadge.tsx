"use client";

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
        <span
            aria-label={label}
            title={label}
            style={{
                color: theme.colors["muted-foreground"],
                border: `1px solid ${theme.colors["muted-foreground"]}`,
                display: "inline-block",
                lineHeight: 1.1,
                borderRadius: theme.radius.sm,
                paddingInline: theme.spacing.xs,
                fontSize: theme.typography.caption,
                fontWeight: "700",
                flexShrink: 0,
            }}
        >
            E
        </span>
    );
}
