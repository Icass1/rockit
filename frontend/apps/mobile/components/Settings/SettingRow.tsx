import { ReactNode } from "react";
import { COLORS } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

interface SettingRowProps {
    label: string;
    value?: ReactNode;
    isLast?: boolean;
}

export default function SettingRow({
    label,
    value,
    isLast = false,
}: SettingRowProps) {
    return (
        <View style={[styles.row, !isLast && styles.rowBorder]}>
            <Text style={styles.label}>{label}</Text>
            {value !== undefined && <View style={styles.value}>{value}</View>}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        minHeight: 48,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.gray800,
    },
    label: {
        color: COLORS.white,
        fontSize: 16,
        flex: 1,
    },
    value: {
        flex: 1,
        alignItems: "flex-end",
    },
});
