import React, { useRef, useState, type ReactNode } from "react";

export default function ContextMenu({
    children,
    closeRef,
}: {
    children: ReactNode[];
    closeRef?: { current?: () => void };
}) {
    const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
    const [contextMenuPos, setContextMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

    if (closeRef)
        closeRef.current = () => {
            setContextMenuOpen(false);
        };

    const contextMenuDivRef = useRef<HTMLDivElement>(null);

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                // @ts-ignore
                contextMenuOpen: contextMenuOpen,
                setContextMenuOpen: setContextMenuOpen,
                contextMenuPos: contextMenuPos,
                setContextMenuPos: setContextMenuPos,
                contextMenuDivRef: contextMenuDivRef,
            });
        }
        return child;
    });

    return childrenWithProps;
}
