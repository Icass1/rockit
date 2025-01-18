import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export default function ContextMenuTrigger({
    children,
    setContextMenuOpen,
    setContextMenuPos,
    contextMenuOpen,
    contextMenuDivRef,
}: {
    children: ReactNode;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    setContextMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;
    contextMenuOpen?: boolean;
    contextMenuDivRef?: RefObject<HTMLDivElement>;
}) {
    const divRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (
        event: React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
    ) => {
        if (!setContextMenuOpen || !setContextMenuPos) return;

        event.preventDefault();

        setContextMenuPos([event.clientX, event.clientY]);
        setContextMenuOpen((value) => !value);
    };

    useEffect(() => {
        if (!setContextMenuOpen) return;

        const closeContextMenu = (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLDivElement, globalThis.MouseEvent>
        ) => {
            if (contextMenuDivRef?.current?.contains(event.target as Node))
                return;

            setContextMenuOpen(false);
        };

        if (contextMenuOpen) {
            document.addEventListener("mouseup", closeContextMenu);
            document.addEventListener("wheel", closeContextMenu);
        }
        return () => {
            document.removeEventListener("mouseup", closeContextMenu);
            document.removeEventListener("wheel", closeContextMenu);
        };
    }, [contextMenuOpen]);

    return (
        <div ref={divRef} onContextMenu={handleContextMenu}>
            {children}
        </div>
    );
}
