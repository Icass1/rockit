"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import { usePopupMenu } from "@/components/PopupMenu/context";

export default function PopupMenuTrigger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}): JSX.Element {
    const { open, setOpen, setPos, contentRef, triggerRef } = usePopupMenu();

    const handleClick = (): void => {
        const boundaries = triggerRef.current?.getBoundingClientRect();
        if (!boundaries) return;
        setPos([boundaries.x + boundaries.width, boundaries.y]);
        setOpen(true);
    };

    useEffect((): (() => void) | undefined => {
        // Solo cerramos con click externo en desktop
        if (!open || typeof window === "undefined" || window.innerWidth < 768)
            return;

        const handleClose = (e: MouseEvent | WheelEvent): void => {
            if (contentRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };

        document.addEventListener("mouseup", handleClose);
        document.addEventListener("wheel", handleClose);
        return (): void => {
            document.removeEventListener("mouseup", handleClose);
            document.removeEventListener("wheel", handleClose);
        };
    }, [open, contentRef, setOpen]);

    return (
        <div ref={triggerRef} className={className} onClick={handleClick}>
            {children}
        </div>
    );
}
