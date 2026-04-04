import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SubContextMenuContext } from "@/components/ContextMenu/SubContextMenu/context";
import type SubContextMenuProps from "@/components/ContextMenu/SubContextMenu/Props";

export default function SubContextMenu({
    children,
    onOpen,
    onClose,
}: {
    children: ReactNode[];
    onOpen?: () => void;
    onClose?: () => void;
}) {
    const _triggerRef = useRef<HTMLDivElement>(null);

    const [_hover, setHover] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        } else {
            timeoutRef.current = setTimeout(() => {
                setHover(false);
            }, 100);
        }
    };

    const subContextMenuValue: SubContextMenuProps = {
        _triggerRef,
        _hover,
        _setHover,
    };

    return (
        <SubContextMenuContext.Provider value={subContextMenuValue}>
            {children}
        </SubContextMenuContext.Provider>
    );
}
