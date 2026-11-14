"use client";

import { User } from "@rockit/ui/icons";
import { Text, View } from "@rockit/ui/runtime";
import { useDesignTheme } from "@rockit/ui/theme";

/** The global count includes this listener; an indicator needs someone else online. */
export function OnlinePresence({
    count,
    label,
    locale,
    iconSize,
}: {
    count: number | undefined;
    label: string;
    locale: string;
    iconSize?: number;
}) {
    const theme = useDesignTheme();
    if (count === undefined || !Number.isFinite(count) || count <= 1)
        return null;
    const formatted = new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(count);
    return (
        <View
            testID="header-online-users"
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${formatted} · ${label}`}
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
            }}
        >
            <Text
                style={{
                    fontSize: theme.typography.body,
                    fontWeight: "600",
                    color: theme.colors.online,
                }}
            >
                {formatted}
            </Text>
            <User
                size={iconSize ?? theme.typography.subtitle}
                color={theme.colors.online}
            />
        </View>
    );
}
