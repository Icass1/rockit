"use client";

import { Pressable, Text } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

export function ActionButton({
    label,
    onPress,
    disabled = false,
    destructive = false,
    selected = false,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    destructive?: boolean;
    selected?: boolean;
}) {
    const theme = useDesignTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => ({
                minHeight: theme.layout.touchTarget,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
                backgroundColor: destructive
                    ? theme.colors.destructive
                    : selected
                      ? theme.colors.primary
                      : theme.colors.secondary,
            })}
        >
            <Text
                style={{
                    color: destructive
                        ? theme.colors["destructive-foreground"]
                        : selected
                          ? theme.colors["primary-foreground"]
                          : theme.colors.foreground,
                    fontSize: theme.typography.body,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
