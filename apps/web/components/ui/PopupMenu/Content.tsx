"use client";

import type { JSX, ReactNode } from "react";
import { Popup } from "@/components/ui/Popup";
import { usePopupMenu } from "@/components/ui/PopupMenu/context";

export default function PopupMenuContent({
    children,
}: {
    children?: ReactNode;
}): JSX.Element {
    const { open, setOpen, pos, contentRef, triggerRef } = usePopupMenu();
    return (
        <Popup
            open={open}
            onClose={() => setOpen(false)}
            contentRef={contentRef}
            anchorRef={triggerRef}
            position={pos}
            calculatePosition={(width) => {
                const anchor = triggerRef.current?.getBoundingClientRect();
                return anchor ? [anchor.right - width, anchor.bottom + 8] : pos;
            }}
        >
            <div className="flex flex-col gap-1">{children}</div>
        </Popup>
    );
}
