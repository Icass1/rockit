import type { ReactNode, RefObject } from "react";
import React from "react";

export default function ContextMenuContent({
    children,
    contextMenuOpen,
    contextMenuPos,
    contextMenuDivRef,
    setContextMenuOpen,
}: {
    children?: ReactNode;
    contextMenuOpen?: boolean;
    contextMenuPos?: [number, number];
    contextMenuDivRef?: RefObject<HTMLDivElement>;
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    if (!contextMenuPos) return;
    if (!contextMenuOpen) return;

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                // @ts-ignore
                setContextMenuOpen: setContextMenuOpen,
            });
        }
        return child;
    });

    return (
        <div
            ref={contextMenuDivRef}
            className="fixed bg-neutral-900/90 backdrop-blur-3xl rounded-md p-1 overflow-hidden shadow-[0px_0px_20px_3px_#0e0e0e] z-20"
            style={{
                display: contextMenuOpen ? "block" : "none",
                left: `${contextMenuPos[0]}px`,
                top: `${contextMenuPos[1]}px`,
            }}
        >
            {childrenWithProps}
        </div>
    );
}
