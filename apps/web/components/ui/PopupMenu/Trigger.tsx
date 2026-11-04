"use client";

import type { JSX, ReactNode } from "react";
import { usePopupMenu } from "@/components/ui/PopupMenu/context";

export default function PopupMenuTrigger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}): JSX.Element {
    const { open, setOpen, setPos, triggerRef } = usePopupMenu();
    return (
        <div
            ref={triggerRef}
            className={className}
            onClick={() => {
                const bounds = triggerRef.current?.getBoundingClientRect();
                if (!bounds) return;
                setPos([bounds.right, bounds.bottom]);
                setOpen(!open);
            }}
        >
            {children}
        </div>
    );
}
