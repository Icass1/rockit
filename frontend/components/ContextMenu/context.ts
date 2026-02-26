import { createContext, useContext } from "react";
import type ContextMenuProps from "@/components/ContextMenu/Props";

export const ContextMenuContext = createContext<ContextMenuProps | null>(null);

export function useContextMenu() {
    const ctx = useContext(ContextMenuContext);
    if (!ctx) throw new Error("useContextMenu must be used inside ContextMenu");
    return ctx;
}
