import type { ReactNode, RefObject } from "react";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
import React, { useEffect, useState } from "react";
import type PopupMenuProps from "./Props";
import { createPortal } from "react-dom";

export default function PopupMenuContent({
    children,
    _popupMenuOpen,
    _setPopupMenuOpen,
    _popupMenuPos,
    _setPopupMenuPos,
    _popupMenuContentRef,
    _popupMenuTriggerRef,
}: PopupMenuProps & { children?: ReactNode }) {
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
        null
    );

    useEffect(() => {
        let portalDiv = document.querySelector("#popup-menu-portal");
        if (portalDiv) {
            setPortalContainer(portalDiv as HTMLElement);
            return;
        }

        portalDiv = document.createElement("div");
        portalDiv.id = "popup-menu-portal";
        document.body.appendChild(portalDiv);
        setPortalContainer(portalDiv as HTMLElement);
    }, []);

    if (!portalContainer) return null;

    if (!children) return;

    const updatePos = (
        _popupMenuPos: [number, number],
        width: number,
        height: number,
        n = 1
    ) => {
        let tempPos = [..._popupMenuPos] as [number, number];

        if (
            height &&
            _popupMenuPos[1] + height > document.body.offsetHeight - 96
        ) {
            tempPos[1] = document.body.offsetHeight - 100 - height;
        }

        if (width && _popupMenuPos[0] + width > document.body.offsetWidth) {
            tempPos[0] = document.body.offsetWidth - 4 - width;
        }

        const triggerBoundaries =
            _popupMenuTriggerRef?.current?.getBoundingClientRect();
        if (!triggerBoundaries) return tempPos;

        // Check if trigger and container intersect
        if (
            tempPos[0] + width > triggerBoundaries.x &&
            tempPos[0] < triggerBoundaries.x + triggerBoundaries.width &&
            tempPos[1] + height > triggerBoundaries.y &&
            tempPos[1] < triggerBoundaries.y + triggerBoundaries.height
        ) {
            if (n == 1) {
                tempPos[0] = triggerBoundaries.x;
                tempPos[1] =
                    triggerBoundaries.y + triggerBoundaries.height + 10;
            } else if (n == 2) {
                tempPos[0] = triggerBoundaries.x - width - 10;
                tempPos[1] = triggerBoundaries.y;
            } else {
                console.warn("Could not find a suitable position for the menu");
                return tempPos;
            }
            updatePos(tempPos, width, height, n + 1);
        }

        return tempPos;
    };

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

    if (!_popupMenuPos) return;
    if (_popupMenuPos[0] == 0 && _popupMenuPos[1] == 0) return;

    if (!portalContainer) return null;

    return createPortal(
        <PosAfterRenderDiv
            divRef={_popupMenuContentRef}
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) => updatePos(_popupMenuPos, width, height)
                    : undefined
            }
            onClick={() => _setPopupMenuOpen && _setPopupMenuOpen(false)}
            className="fixed bg-neutral-800/90 top-0 left-0 w-full h-[calc(100%_-_4rem)] px-10 md:w-max md:h-auto rounded-md md:p-1 overflow-auto md:shadow-[0px_0px_20px_3px_#0e0e0e] z-50"
            style={{
                display: _popupMenuOpen ? "block" : "none",
            }}
        >
            <div className="overflow-y-auto h-full flex flex-col gap-y-1 py-20 md:py-0">
                {childrenWithProps}
                <div className="md:hidden min-h-2"></div>
            </div>
        </PosAfterRenderDiv>,
        portalContainer
    );
}
