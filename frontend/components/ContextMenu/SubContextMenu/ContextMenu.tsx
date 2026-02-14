import type { ReactNode } from "react";
import React, { useEffect, useRef, useState } from "react";
import type ContextMenuProps from "@/components/ContextMenu/Props";
import type SubContextMenuProps from "./Props";

export default function SubContextMenu({
    children,
    onOpen,
    onClose,
    _setContextMenuOpen,
    _setContextMenuPos,
    _contextMenuDivRef,
    _contextMenuOpen,
    _contextMenuPos,
}: ContextMenuProps & {
    children: ReactNode[];
    onOpen?: () => void;
    onClose?: () => void;
}) {
    const _triggerRef = useRef<HTMLDivElement>(null);

    const [_hover, setHover] = useState(false);

    let timeout: NodeJS.Timeout;

    useEffect(() => {
        if (_hover && onOpen) {
            onOpen();
        }
        if (!_hover && onClose) {
            onClose();
        }
    }, [_hover, onClose, onOpen]);

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
