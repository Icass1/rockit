"use client";

import type { JSX, MouseEventHandler, ReactNode } from "react";
import { usePopupMenu } from "@/components/PopupMenu/context";

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
        <div
            onClick={(e): void => {
                if (disable) return;
                e.stopPropagation();
                onClick?.(e);
                if (closeOnClick) setOpen(false);
            }}
            className={[
                "flex cursor-pointer flex-row items-center gap-2 rounded-sm p-2 text-sm font-semibold md:hover:bg-neutral-700",
                disable || !onClick ? "pointer-events-none opacity-50" : "",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </div>
    );
}
