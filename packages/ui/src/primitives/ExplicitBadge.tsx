"use client";

import { ExplicitMark } from "@rockit/ui/icons";
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
            role="img"
            aria-label={label}
            title={label}
            style={{
                backgroundColor: theme.colors["explicit-foreground"],
                width: theme.layout.explicitBadgeSize,
                height: theme.layout.explicitBadgeSize,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                verticalAlign: "middle",
                borderRadius: theme.layout.explicitBadgeRadius,
                flexShrink: 0,
            }}
        >
            <ExplicitMark
                size={theme.layout.explicitBadgeSize}
                fill={theme.colors["explicit-background"]}
                strokeWidth={0}
                aria-hidden="true"
                focusable="false"
            />
        </span>
    );
}
