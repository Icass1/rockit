import {
    RefObject,
    useEffect,
    useRef,
    useState,
    type JSX,
    type ReactNode,
} from "react";
import { ContextMenuContext } from "@/components/ContextMenu/context";
import type ContextMenuProps from "@/components/ContextMenu/Props";

export default function ContextMenu({
    children,
    closeRef,
    openRef,
    onOpen,
}: {
    children: ReactNode[];
    closeRef?: { current?: () => void };
    openRef?: { current: ((pos: [number, number]) => void) | null };
    onOpen?: () => void;
}): JSX.Element {
    const [_contextMenuOpen, _setContextMenuOpen] = useState<boolean>(false);
    const [_contextMenuPos, _setContextMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

    useEffect((): void => {
        if (closeRef) {
            closeRef.current = (): void => {
                _setContextMenuOpen(false);
            };
        }
    }, [closeRef]);

    useEffect((): void => {
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
