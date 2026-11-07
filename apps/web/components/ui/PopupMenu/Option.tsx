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
                "hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full items-center gap-2 rounded-md p-2 text-left text-sm font-semibold transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50",
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
