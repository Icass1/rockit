import { useStore } from "@nanostores/react";
import { useDesignTheme, useThemedStyles, type DesignTheme } from "@rockit/ui";
import { CircleCheck, CircleX, Info } from "@rockit/ui/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EToastType } from "@/models/enums/toastType";
import { toasterManager } from "@/lib/toasterManager";

const TOAST_COLORS = (theme: DesignTheme): Record<EToastType, string> => ({
    [EToastType.ERROR]: theme.colors["destructive"],
    [EToastType.INFO]: theme.colors["info"],
    [EToastType.WARN]: theme.colors["warning"],
    [EToastType.SUCCESS]: theme.colors["success"],
});

const TOAST_ICONS: Record<
    EToastType,
    React.ComponentType<{ size?: number; color: string }>
> = {
    [EToastType.ERROR]: CircleX,
    [EToastType.INFO]: Info,
    [EToastType.WARN]: Info,
    [EToastType.SUCCESS]: CircleCheck,
};

export function Toaster() {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const toasts = useStore(toasterManager.toastsAtom);

    if (toasts.length === 0) return null;

    const toast = toasts[0];
    const color = TOAST_COLORS(theme)[toast.type];
    const Icon = TOAST_ICONS[toast.type];

    return (
        <View style={styles.container}>
            <Pressable
                style={[styles.toast, { backgroundColor: theme.legacy.bgCard }]}
                onPress={() => toasterManager.dismiss(toast.id)}
            >
                <Icon size={20} color={color} />
                <Text style={styles.message} numberOfLines={2}>
                    {toast.message}
                </Text>
            </Pressable>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            position: "absolute",
            top: 60,
            left: 16,
            right: 16,
            zIndex: 9999,
        },
        toast: {
            flexDirection: "row",
            alignItems: "center",
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            gap: 10,
            shadowColor: theme.colors["backdrop"],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        message: {
            flex: 1,
            color: theme.legacy.white,
            fontSize: theme.typography.body,
            fontWeight: "500",
        },
    });
