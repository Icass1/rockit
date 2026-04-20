import { COLORS } from "@/constants/theme";
import { useStore } from "@nanostores/react";
import { CircleCheck, CircleX, Info } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EToastType } from "@/models/enums/toastType";
import { toasterManager } from "@/lib/toasterManager";

const TOAST_COLORS: Record<EToastType, string> = {
    [EToastType.ERROR]: "#ef4444",
    [EToastType.INFO]: "#3b82f6",
    [EToastType.WARN]: "#eab308",
    [EToastType.SUCCESS]: "#22c55e",
};

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
    const toasts = useStore(toasterManager.toastsAtom);

    if (toasts.length === 0) return null;

    const toast = toasts[0];
    const color = TOAST_COLORS[toast.type];
    const Icon = TOAST_ICONS[toast.type];

    return (
        <View style={styles.container}>
            <Pressable
                style={[styles.toast, { backgroundColor: COLORS.bgCard }]}
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

const styles = StyleSheet.create({
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
        padding: 12,
        borderRadius: 8,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    message: {
        flex: 1,
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "500",
    },
});
