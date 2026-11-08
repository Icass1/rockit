import { ReactNode } from "react";
import { useThemedStyles, type DesignTheme } from "@rockit/ui";
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
    const styles = useThemedStyles(createStyles);
    return (
        <View style={[styles.row, !isLast && styles.rowBorder]}>
            <Text style={styles.label}>{label}</Text>
            {value !== undefined && <View style={styles.value}>{value}</View>}
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        row: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        rowBorder: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.legacy.gray800,
        },
        label: {
            color: theme.legacy.white,
            fontSize: theme.typography.label,
            flex: 1,
        },
        value: {
            flex: 1,
            alignItems: "flex-end",
        },
    });
