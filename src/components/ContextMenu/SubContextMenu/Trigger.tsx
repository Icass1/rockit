import { ChevronRight } from "lucide-react";
import type { ReactNode, RefObject } from "react";

export default function SubContextMenuTrigger({
    children,
    className,
    disable,
    triggerRef,
    setHover,
}: {
    children: ReactNode[];
    triggerRef?: RefObject<HTMLDivElement>;
    className?: string;
    disable?: boolean;
    setHover?: (value: boolean) => void;
}) {
    return (
        <div
            ref={triggerRef}
            onClick={(e) => {
                e.stopPropagation();
                if (disable) return;
            }}
            onMouseEnter={() => {
                if (disable) return;
                if (setHover) setHover(true);
            }}
            onMouseLeave={() => {
                if (setHover) {
                    if (disable) return;
                    setHover(false);
                }
            }}
            className={
                (className ?? "") +
                " context-menu-option md:hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm  " +
                (className ?? "") +
                (disable ? " pointer-events-none opacity-50 " : "")
            }
        >
            <div className="grid grid-cols-[1fr_20px] items-center">
                <div className="w-full max-w-full min-w-0 flex flex-row items-center gap-2">
                    {children}
                </div>
                <ChevronRight className="w-full max-w-full min-w-0 h-auto aspect-square" />
            </div>
        </div>
    );
}
