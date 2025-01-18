import React, { useRef, useState, type ReactNode } from "react";

export default function ContextMenu({ children }: { children: ReactNode[] }) {
    const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
    const [contextMenuPos, setContextMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

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
