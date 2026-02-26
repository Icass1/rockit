import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type SubContextMenuProps from "@/components/ContextMenu/SubContextMenu/Props";
import { useSubContextMenu } from "@/components/ContextMenu/SubContextMenu/context";

export default function SubContextMenuTrigger({
    children,
    className,
    disable,
}: SubContextMenuProps & {
    children: ReactNode[];
    className?: string;
    disable?: boolean;
}) {
    const { _triggerRef, _setHover } = useSubContextMenu();

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
                <div className="flex w-full max-w-full min-w-0 flex-row items-center gap-2">
                    {children}
                </div>
                <ChevronRight className="aspect-square h-auto w-full max-w-full min-w-0" />
            </div>
        </div>
    );
}
