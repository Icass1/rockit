import type { RefObject } from "react";

export default interface PopupMenuProps {
    _popupMenuOpen?: boolean;
    _setPopupMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    _popupMenuPos?: [number, number];
    _setPopupMenuPos?: React.Dispatch<React.SetStateAction<[number, number]>>;
    _popupMenuContentRef?: RefObject<HTMLDivElement>;
    _popupMenuTriggerRef?: RefObject<HTMLDivElement>;
}
