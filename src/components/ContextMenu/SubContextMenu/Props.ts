import type { RefObject } from "react";

export default interface SubContextMenuProps {
    _hover?: boolean;
    _setHover?: (value: boolean) => void;
    _triggerRef?: RefObject<HTMLDivElement>;
}
