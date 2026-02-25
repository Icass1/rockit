"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { usePopupMenu } from "@/components/PopupMenu/context";

export default function PopupMenuOption({
    children,
    onClick,
    closeOnClick = true,
    disabled = false,
    className,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    disabled?: boolean;
    closeOnClick?: boolean;
    className?: string;
}) {
    const { setOpen } = usePopupMenu();

    return (
        <div
            onClick={(e) => {
                if (disabled) return;
                e.stopPropagation();
                onClick?.(e);
                if (closeOnClick) setOpen(false);
            }}
            className={[
                "flex cursor-pointer flex-row items-center gap-2 rounded-sm p-2 text-sm font-semibold md:hover:bg-neutral-700",
                disabled || !onClick ? "pointer-events-none opacity-50" : "",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </div>
    );
}
