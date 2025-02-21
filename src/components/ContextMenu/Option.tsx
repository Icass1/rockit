import type { MouseEventHandler, ReactNode } from "react";

export default function ContextMenuOption({
    children,
    onClick,
    setContextMenuOpen,
    className,
    disable = false,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    className?: string;
    disable?: boolean;
}) {
    // console.log(onClick);

    return (
        <div
            onClick={(e) => {
                onClick && onClick(e);
                setContextMenuOpen && setContextMenuOpen(false);
            }}
            className={
                className +
                " context-menu-option md:hover:bg-neutral-700 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2 " +
                className +
                (disable || !onClick ? " pointer-events-none opacity-50 " : "")
            }
        >
            {children}
        </div>
    );
}
