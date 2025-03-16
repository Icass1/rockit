import type { ReactNode, RefObject } from "react";
import React, { useRef, useState } from "react";

export default function SubContextMenu({
    children,
    setContextMenuOpen,
    setContextMenuPos,
    contextMenuDivRef,
    contextMenuOpen,
    contextMenuPos,
}: {
    children: ReactNode[];
    setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    setContextMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;
    contextMenuOpen?: boolean;
    contextMenuDivRef?: RefObject<HTMLDivElement>;
    contextMenuPos?: [number, number];
}) {
    const triggerRef = useRef<HTMLDivElement>(null);

    const [hover, _setHover] = useState(false);

    let timeout: NodeJS.Timeout;

    const setHover = (value: boolean) => {
        if (value) {
            _setHover(true);
            clearTimeout(timeout);
        } else {
            timeout = setTimeout(() => {
                _setHover(false);
            }, 100);
        }
    };

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                // @ts-ignore
                contextMenuOpen,
                setContextMenuOpen,
                contextMenuPos,
                setContextMenuPos,
                contextMenuDivRef,
                triggerRef,
                hover,
                setHover,
            });
        }
        return child;
    });

    return childrenWithProps;
}
