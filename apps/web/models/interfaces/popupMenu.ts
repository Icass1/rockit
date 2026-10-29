import type { RefObject } from "react";

export interface IPopupMenuContext {
    open: boolean;
    setOpen: (open: boolean) => void;
    pos: [number, number];
    setPos: (pos: [number, number]) => void;
    contentRef: RefObject<HTMLDivElement>;
    triggerRef: RefObject<HTMLDivElement>;
}
