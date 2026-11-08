"use client";

import type { ReactNode } from "react";
import { Pressable } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function IconButton({
    label,
    onPress,
    children,
    disabled = false,
}: {
    label: string;
    onPress: () => void;
    children: ReactNode;
    disabled?: boolean;
}) {
    const theme = useDesignTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => ({
                minWidth: theme.layout.touchTarget,
                minHeight: theme.layout.touchTarget,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.hover : undefined,
                opacity: disabled ? 0.5 : 1,
            })}
        >
            {children}
        </Pressable>
    );
}
