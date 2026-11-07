"use client";

import type { JSX, ReactNode } from "react";
import { useContextMenu } from "@/components/ui/ContextMenu/context";
import { useSubContextMenu } from "@/components/ui/ContextMenu/SubContextMenu/context";
import { Popup } from "@/components/ui/Popup";

export default function SubContextMenuContent({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const { _contextMenuDivRef } = useContextMenu();
    const { _triggerRef, _hover, _setHover } = useSubContextMenu();
    return (
        <Popup
            open={!!_hover}
            onClose={() => _setHover?.(false)}
            anchorRef={_triggerRef}
            parentRef={_contextMenuDivRef}
            calculatePosition={(width) => {
                const parent =
                    _contextMenuDivRef?.current?.getBoundingClientRect();
                const anchor = _triggerRef?.current?.getBoundingClientRect();
                if (!parent || !anchor) return [4, 4];
                return [
                    parent.right + width + 7 > window.innerWidth
                        ? parent.left - width - 3
                        : parent.right + 3,
                    anchor.top,
                ];
            }}
            onMouseEnter={() => _setHover?.(true)}
            onMouseLeave={() => _setHover?.(false)}
        >
            <div className="flex flex-col gap-1">{children}</div>
        </Popup>
    );
}
