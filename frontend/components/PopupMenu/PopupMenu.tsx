import React, { RefObject, useRef, useState, type ReactNode } from "react";
import PopupMenuOption from "@/components/PopupMenu/Option";
import PopupMenuContent from "@/components/PopupMenu/Content";
import PopupMenuTrigger from "@/components/PopupMenu/Trigger";
import type PopupMenuProps from "./Props";

function PopupMenu({ children }: { children: ReactNode[] }) {
    const [_popupMenuOpen, _setPopupMenuOpen] = useState(false);
    const [_popupMenuPos, _setPopupMenuPos] = useState<[number, number]>([
        0, 0,
    ]);

    const _popupMenuContentRef = useRef<HTMLDivElement>(
        null
    ) as RefObject<HTMLDivElement>;
    const _popupMenuTriggerRef = useRef<HTMLDivElement>(
        null
    ) as RefObject<HTMLDivElement>;

    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            const props: PopupMenuProps = {
                _popupMenuOpen,
                _setPopupMenuOpen,
                _popupMenuPos,
                _setPopupMenuPos,
                _popupMenuContentRef,
                _popupMenuTriggerRef,
            };

            return React.cloneElement(child, props);
        }
        return child;
    });

    return childrenWithProps;
}

export { PopupMenu, PopupMenuContent, PopupMenuOption, PopupMenuTrigger };
