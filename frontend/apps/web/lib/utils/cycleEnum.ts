import { TEnumValue } from "@/models/types/enumValue";

// Utility type: Extract only the enum's value types.
type EnumValue<E> = TEnumValue<E>;

export function cycleEnum<E extends Record<string, string | number>>(
    enumObj: E,
    current: EnumValue<E>
): EnumValue<E> {
    // Extract only actual values (ignore numeric reverse mappings).
    const values = Object.values(enumObj).filter(
        (v) => typeof v !== "number" || !enumObj[v]
    ) as EnumValue<E>[];

    const index = values.indexOf(current);
    if (index === -1) throw new Error("Current value is not part of the enum.");

    // Cycle.
    const nextIndex = (index + 1) % values.length;
    return values[nextIndex];
}
