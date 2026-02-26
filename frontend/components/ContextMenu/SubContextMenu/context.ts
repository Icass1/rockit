import { createContext, useContext } from "react";
import type SubContextMenuProps from "@/components/ContextMenu/SubContextMenu/Props";

export const SubContextMenuContext = createContext<SubContextMenuProps | null>(
    null
);

export function useSubContextMenu() {
    const ctx = useContext(SubContextMenuContext);
    if (!ctx)
        throw new Error("useSubContextMenu must be used inside SubContextMenu");
    return ctx;
}
