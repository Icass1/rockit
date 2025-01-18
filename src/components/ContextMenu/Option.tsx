import type { MouseEventHandler, ReactNode } from "react";

export default function ContextMenuOption({
    children,
    onClick,
    setContextMenuOpen,
    className,
}: {
    children: ReactNode;
    onClick?: MouseEventHandler;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    className?: string;
}) {
    return (
        <div
            onClick={(e) => {
                onClick && onClick(e);
                setContextMenuOpen && setContextMenuOpen(false);
            }}
            className={
                className +
                " hover:bg-neutral-800 rounded-sm p-2 cursor-pointer font-semibold text-sm flex flex-row items-center gap-2 " +
                className
            }
        >
            {children}
        </div>
    );
}
