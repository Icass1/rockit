import type { MouseEventHandler, ReactNode } from "react";
import { useContextMenu } from "@/components/ContextMenu/context";

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
}) {
    const { _setContextMenuOpen } = useContextMenu();

    return (
        <div
            onClick={(e) => {
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
                // Fixed: className was concatenated TWICE — any custom class
                // like "hover:bg-red-700" was appearing twice in the DOM
                className ?? "",
                "context-menu-option flex cursor-pointer flex-row items-center gap-2 rounded-sm p-2 text-sm font-semibold md:hover:bg-neutral-700",
                disable || !onClick ? " pointer-events-none opacity-50" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </div>
    );
}
