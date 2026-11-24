"use client";

import { useState } from "react";

/** Sort a copy of the complete result set before any presentation limit. */
export function useAdminTableSort<T>(initial: keyof T): {
    sort: (rows: readonly T[]) => T[];
    header: (key: keyof T) => {
        "aria-sort": "ascending" | "descending" | "none";
    };
    indicator: (key: keyof T) => string;
    toggle: (key: keyof T) => void;
} {
    const [column, setColumn] = useState(initial);
    const [ascending, setAscending] = useState(false);
    return {
        sort: (rows: readonly T[]) =>
            [...rows].sort((a, b) => {
                const left = a[column],
                    right = b[column];
                const order =
                    typeof left === "number" && typeof right === "number"
                        ? left - right
                        : String(left ?? "").localeCompare(
                              String(right ?? ""),
                              undefined,
                              { numeric: true }
                          );
                return ascending ? order : -order;
            }),
        header: (key: keyof T) => ({
            "aria-sort":
                column === key
                    ? ((ascending ? "ascending" : "descending") as
                          "ascending" | "descending")
                    : ("none" as const),
        }),
        indicator: (key: keyof T) =>
            column === key ? (ascending ? " ↑" : " ↓") : " ↕",
        toggle: (key: keyof T) => {
            if (column === key) setAscending((value) => !value);
            else {
                setColumn(key);
                setAscending(
                    key === "count" || key === "requestCount" ? false : true
                );
            }
        },
    };
}
