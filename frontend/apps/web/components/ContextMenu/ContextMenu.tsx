import React, {
    RefObject,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { ContextMenuContext } from "@/components/ContextMenu/context";
import type ContextMenuProps from "@/components/ContextMenu/Props";

export default function ContextMenu({
    children,
    closeRef,
    onOpen,
}: {
    children: ReactNode[];
    closeRef?: { current?: () => void };
    onOpen?: () => void;
}) {
    const [_contextMenuOpen, _setContextMenuOpen] = useState<boolean>(false);
    const [_contextMenuPos, _setContextMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

    useEffect(() => {
        if (closeRef) {
            closeRef.current = () => {
                _setContextMenuOpen(false);
            };
        }
    }, [closeRef]);

    useEffect(() => {
        if (onOpen) {
            onOpen();
        }
    }, [onOpen, _contextMenuOpen]);

    const _contextMenuDivRef = useRef<HTMLDivElement>(
        null
    ) as RefObject<HTMLDivElement>;

    const contextValue: ContextMenuProps = {
        _contextMenuOpen,
        _setContextMenuOpen,
        _contextMenuPos,
        _setContextMenuPos,
        _contextMenuDivRef,
    };

    return (
        <ContextMenuContext.Provider value={contextValue}>
            {children}
        </ContextMenuContext.Provider>
    );
}
