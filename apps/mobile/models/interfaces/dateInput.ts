export interface DateInputEvent {
    type: "set" | "dismissed" | "neutralButtonPressed";
}

export interface DateInputProps {
    value: Date;
    maximumDate?: Date;
    minimumDate?: Date;
    label: string;
    onChange(event: DateInputEvent, date?: Date): void;
}
