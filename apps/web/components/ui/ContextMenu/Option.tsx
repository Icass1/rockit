import type { JSX, MouseEventHandler, ReactNode } from "react";
import { useContextMenu } from "@/components/ui/ContextMenu/context";

export default function ContextMenuOption({
    children,
    onClick,
    className,
    closeOnClick = true,
    disable = false,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    closeOnClick?: boolean;
    className?: string;
    disable?: boolean;
}): JSX.Element {
    const { _setContextMenuOpen } = useContextMenu();

    return (
        <button
            type="button"
            disabled={disable || !onClick}
            onClick={(e): void => {
                if (disable) return;
                e.stopPropagation();
                if (onClick) {
                    onClick(e);
                }
                if (closeOnClick && _setContextMenuOpen) {
                    _setContextMenuOpen(false);
                }
            }}
            className={[
                className ?? "",
                "context-menu-option overlay-action overlay-menu-item text-left",
                disable || !onClick ? "pointer-events-none opacity-50" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </button>
    );
}
