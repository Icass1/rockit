import { createContext, useContext, type RefObject } from "react";

interface PopupMenuContext {
    open: boolean;
    setOpen: (open: boolean) => void;
    pos: [number, number];
    setPos: (pos: [number, number]) => void;
    contentRef: RefObject<HTMLDivElement>;
    triggerRef: RefObject<HTMLDivElement>;
}

export const PopupMenuContext = createContext<PopupMenuContext | null>(null);

export function usePopupMenu() {
    const ctx = useContext(PopupMenuContext);
    if (!ctx) throw new Error("usePopupMenu must be used inside <PopupMenu>");
    return ctx;
}
