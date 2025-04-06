import type { MouseEventHandler, ReactNode } from "react";
import type PopupMenuProps from "./Props";

export default function PopupMenuOption({
    children,
    onClick,
    closeOnClick = true,
    disable = false,
    _setPopupMenuOpen,
    className,
}: PopupMenuProps & {
    children: ReactNode;
    onClick?: MouseEventHandler;
    disable?: boolean;
    closeOnClick?: boolean;
    className?: string;
}) {
    return (
        <div
            onClick={(e) => {
                if (disable) return;
                e.stopPropagation();
                if (onClick) {
                    onClick(e);
                }
                if (closeOnClick && _setPopupMenuOpen) {
                    _setPopupMenuOpen(false);
                }
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
