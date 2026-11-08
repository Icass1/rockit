import DateTimePicker from "@react-native-community/datetimepicker";
import { useDesignTheme } from "@rockit/ui";
import { Platform } from "react-native";
import type { DateInputProps } from "@/models/interfaces/dateInput";

export default function DateInput({ label, ...props }: DateInputProps) {
    const theme = useDesignTheme();
    return (
        <DateTimePicker
            {...props}
            accessibilityLabel={label}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor={theme.colors.foreground}
        />
    );
}
