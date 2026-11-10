"use client";

import type { JSX, MouseEventHandler, ReactNode } from "react";
import { usePopupMenu } from "@/components/ui/PopupMenu/context";

export default function PopupMenuOption({
    children,
    onClick,
    closeOnClick = true,
    disable = false,
    className,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    disable?: boolean;
    closeOnClick?: boolean;
    className?: string;
}): JSX.Element {
    const { setOpen } = usePopupMenu();

    return (
        <button
            type="button"
            disabled={disable || !onClick}
            onClick={(e): void => {
                if (disable) return;
                e.stopPropagation();
                onClick?.(e);
                if (closeOnClick) setOpen(false);
            }}
            className={[
                "overlay-action overlay-menu-item text-left",
                disable || !onClick ? "pointer-events-none opacity-50" : "",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </button>
    );
}
