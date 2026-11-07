"use client";

import type { JSX, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useSubContextMenu } from "@/components/ui/ContextMenu/SubContextMenu/context";

export default function SubContextMenuTrigger({
    children,
    className = "",
    disable = false,
}: {
    children: ReactNode;
    className?: string;
    disable?: boolean;
}): JSX.Element {
    const { _triggerRef, _setHover, _hover } = useSubContextMenu();
    return (
        <button
            type="button"
            ref={_triggerRef}
            disabled={disable}
            aria-haspopup="dialog"
            aria-expanded={!!_hover}
            onClick={(event) => {
                event.stopPropagation();
                _setHover?.(!_hover);
            }}
            onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    _setHover?.(true);
                }
            }}
            onMouseEnter={() => {
                if (!disable) _setHover?.(true);
            }}
            onMouseLeave={() => _setHover?.(false)}
            className={`hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-md p-2 text-left text-sm font-semibold focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
        >
            <span className="flex min-w-0 items-center gap-2">{children}</span>
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </button>
    );
}
