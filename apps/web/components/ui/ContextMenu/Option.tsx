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
                "hover:bg-accent focus-visible:outline-ring flex min-h-11 w-full items-center gap-2 rounded-md p-2 text-left text-sm font-semibold transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50",
                disable || !onClick ? "pointer-events-none opacity-50" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
        </button>
    );
}
