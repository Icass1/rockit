import type { ReactNode, RefObject } from "react";
import React, { useRef, useState } from "react";
import type ContextMenuProps from "../Props";
import type SubContextMenuProps from "./Props";

export default function SubContextMenu({
    children,
    _setContextMenuOpen,
    _setContextMenuPos,
    _contextMenuDivRef,
    _contextMenuOpen,
    _contextMenuPos,
}: ContextMenuProps & {
    children: ReactNode[];
}) {
    const _triggerRef = useRef<HTMLDivElement>(null);

    const [_hover, setHover] = useState(false);

    let timeout: NodeJS.Timeout;

    const _setHover = (value: boolean) => {
        if (value) {
            setHover(true);
            clearTimeout(timeout);
        } else {
            timeout = setTimeout(() => {
                setHover(false);
            }, 100);
        }
    };

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            const props: ContextMenuProps & SubContextMenuProps = {
                _contextMenuOpen,
                _setContextMenuOpen,
                _contextMenuPos,
                _setContextMenuPos,
                _contextMenuDivRef,
                _triggerRef,
                _hover,
                _setHover,
            };

            return React.cloneElement(child, props);
        }
        return child;
    });

    return childrenWithProps;
}
