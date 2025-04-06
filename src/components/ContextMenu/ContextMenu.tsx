import React, { RefObject, useRef, useState, type ReactNode } from "react";
import type ContextMenuProps from "./Props";

export default function ContextMenu({
    children,
    closeRef,
}: {
    children: ReactNode[];
    closeRef?: { current?: () => void };
}) {
    const [_contextMenuOpen, _setContextMenuOpen] = useState<boolean>(false);
    const [_contextMenuPos, _setContextMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

    if (closeRef)
        closeRef.current = () => {
            _setContextMenuOpen(false);
        };

    const _contextMenuDivRef = useRef<HTMLDivElement>(
        null
    ) as RefObject<HTMLDivElement>;

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            const props: ContextMenuProps = {
                _contextMenuOpen,
                _setContextMenuOpen,
                _contextMenuPos,
                _setContextMenuPos,
                _contextMenuDivRef,
            };

            return React.cloneElement(child, props);
        }
        return child;
    });

    return childrenWithProps;
}
