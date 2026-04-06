import { createContext, useContext } from "react";
import { IPopupMenuContext } from "@/models/interfaces/popupMenu";

export const PopupMenuContext = createContext<IPopupMenuContext | null>(null);

export function usePopupMenu() {
    const ctx = useContext(PopupMenuContext);
    if (!ctx) throw new Error("usePopupMenu must be used inside <PopupMenu>");
    return ctx;
}
