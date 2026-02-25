"use client";

import { useRef, useState, type ReactNode } from "react";
import { PopupMenuContext } from "./context";

export default function PopupMenu({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<[number, number]>([0, 0]);
    const contentRef = useRef<HTMLDivElement>(
        null
    ) as React.RefObject<HTMLDivElement>;
    const triggerRef = useRef<HTMLDivElement>(
        null
    ) as React.RefObject<HTMLDivElement>;

    return (
        <PopupMenuContext.Provider
            value={{ open, setOpen, pos, setPos, contentRef, triggerRef }}
        >
            {children}
        </PopupMenuContext.Provider>
    );
}
