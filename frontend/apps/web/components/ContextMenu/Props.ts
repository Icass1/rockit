import type { RefObject } from "react";

export default interface ContextMenuProps {
    _contextMenuOpen?: boolean;
    _contextMenuPos?: [number, number];
    _contextMenuDivRef?: RefObject<HTMLDivElement>;
    _setContextMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    _setContextMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;
}
