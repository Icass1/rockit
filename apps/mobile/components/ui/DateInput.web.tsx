import { useDesignTheme } from "@rockit/ui";
import type { DateInputProps } from "@/models/interfaces/dateInput";

function formatDate(value?: Date): string | undefined {
    return value
        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
        : undefined;
}

export default function DateInput({
    value,
    maximumDate,
    minimumDate,
    label,
    onChange,
}: DateInputProps) {
    const theme = useDesignTheme();
    return (
        <input
            type="date"
            aria-label={label}
            value={formatDate(value)}
            min={formatDate(minimumDate)}
            max={formatDate(maximumDate)}
            style={{
                color: theme.colors.foreground,
                background: theme.colors.surface,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                borderColor: theme.colors.border,
            }}
            onChange={(event) => {
                if (event.target.value)
                    onChange(
                        { type: "set" },
                        new Date(event.target.value + "T12:00:00")
                    );
            }}
        />
    );
}
