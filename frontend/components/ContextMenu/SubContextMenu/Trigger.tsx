import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type SubContextMenuProps from "./Props";

export default function SubContextMenuTrigger({
    children,
    className,
    disable,
    _triggerRef,
    _setHover,
}: SubContextMenuProps & {
    children: ReactNode[];
    className?: string;
    disable?: boolean;
}) {
    return (
        <div
            ref={_triggerRef}
            onClick={(e) => {
                e.stopPropagation();
                if (disable) return;
            }}
            onMouseEnter={() => {
                if (disable) return;
                if (_setHover) _setHover(true);
            }}
            onMouseLeave={() => {
                if (_setHover) {
                    if (disable) return;
                    _setHover(false);
                }
            }}
            className={
                (className ?? "") +
                " context-menu-option cursor-pointer rounded-sm p-2 text-sm font-semibold md:hover:bg-neutral-700" +
                (className ?? "") +
                (disable ? " pointer-events-none opacity-50" : "")
            }
        >
            <div className="grid grid-cols-[1fr_20px] items-center">
                <div className="flex w-full min-w-0 max-w-full flex-row items-center gap-2">
                    {children}
                </div>
                <ChevronRight className="aspect-square h-auto w-full min-w-0 max-w-full" />
            </div>
        </div>
    );
}
