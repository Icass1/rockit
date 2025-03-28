import type { MouseEventHandler, ReactNode } from "react";
import type ContextMenuProps from "./Props";

export default function ContextMenuOption({
    children,
    onClick,
    _setContextMenuOpen,
    className,
    closeOnClick = true,
    disable = false,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    closeOnClick?: boolean;
    className?: string;
    disable?: boolean;
} & ContextMenuProps) {
    return (
        <div
            onClick={(e) => {
                if (disable) return;
                e.stopPropagation();
                onClick && onClick(e);
                closeOnClick &&
                    _setContextMenuOpen &&
                    _setContextMenuOpen(false);
            }}
            className={
                (className ?? "") +
                " context-menu-option md:hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2 " +
                (className ?? "") +
                (disable || !onClick ? " pointer-events-none opacity-50 " : "")
            }
        >
            {children}
        </div>
    );
}
