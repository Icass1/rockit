import { TEnumValue } from "@/models/types/enumValue";

// Utility type: Extract only the enum's value types.
type EnumValue<E> = TEnumValue<E>;

export function cycleEnum<E extends Record<string, string | number>>(
    enumObj: E,
    current: EnumValue<E>
): EnumValue<E> {
    const allValues = Object.values(enumObj);
    const hasNumeric = allValues.some((v): boolean => typeof v === "number");
    const values = (hasNumeric
        ? allValues.filter((v): boolean => typeof v === "number")
        : allValues) as EnumValue<E>[];

    const index = values.indexOf(current);
    if (index === -1) throw new Error("Current value is not part of the enum.");

    // Cycle.
    const nextIndex = (index + 1) % values.length;
    return values[nextIndex];
}
