import type { ReactNode, RefObject } from "react";
import React, { useLayoutEffect, useState } from "react";

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

    const [pos, setPos] = useState([...contextMenuPos]);

    useLayoutEffect(() => {
        let tempPos = [...contextMenuPos];

        if (
            contextMenuDivRef?.current?.offsetHeight &&
            contextMenuPos[1] + contextMenuDivRef?.current?.offsetHeight >
                document.body.offsetHeight - 96
        ) {
            tempPos[1] =
                document.body.offsetHeight -
                100 -
                contextMenuDivRef?.current?.offsetHeight;
        }

        if (
            contextMenuDivRef?.current?.offsetWidth &&
            contextMenuPos[0] + contextMenuDivRef.current.offsetWidth >
                document.body.offsetWidth
        ) {
            tempPos[0] =
                document.body.offsetWidth -
                4 -
                contextMenuDivRef.current.offsetWidth;
        }
        setPos(tempPos);
    }, []);

    return (
        <div
            ref={contextMenuDivRef}
            className="fixed bg-neutral-900/90 backdrop-blur-3xl w-max rounded-md p-1 overflow-hidden shadow-[0px_0px_20px_3px_#0e0e0e] z-20"
            style={{
                display: contextMenuOpen ? "block" : "none",
                left: `${pos[0]}px`,
                top: `${pos[1]}px`,
            }}
        >
            {childrenWithProps}
        </div>
    );
}
