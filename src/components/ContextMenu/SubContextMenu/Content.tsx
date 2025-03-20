import type { ReactNode, RefObject } from "react";
import React from "react";
import ContextMenuContentDiv from "@/components/PosAfterRenderDiv";
import type ContextMenuProps from "../Props";
import type SubContextMenuProps from "./Props";

export default function SubContextMenuContent({
    children,
    _contextMenuPos,
    _contextMenuDivRef,
    _setContextMenuOpen,
    _setContextMenuPos,
    _contextMenuOpen,
    _triggerRef,
    _hover,
    _setHover,
}: ContextMenuProps &
    SubContextMenuProps & {
        children: ReactNode[] | ReactNode;
    }) {
    const childrenWithProps = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            const props: ContextMenuProps = {
                _contextMenuOpen,
                _setContextMenuOpen,
                _contextMenuPos,
                _setContextMenuPos,
                _contextMenuDivRef,
            };

            return React.cloneElement(child, props);
        }
        return child;
    });

    const triggerBoundaries = _triggerRef?.current?.getBoundingClientRect();
    const contextMenuBoundaries =
        _contextMenuDivRef?.current?.getBoundingClientRect();

    if (!contextMenuBoundaries || !triggerBoundaries || !_triggerRef?.current)
        return;

    const updatePos: (width: number, height: number) => [number, number] = (
        width: number,
        height: number
    ) => {
        console.log(width, height);

        let x = contextMenuBoundaries.x + contextMenuBoundaries.width + 3;
        const y = triggerBoundaries.y;

        if (x + width > innerWidth) {
            x = contextMenuBoundaries.x - width - 3;
        }

        return [x, y];
    };

    if (!_hover) return;

    return (
        <ContextMenuContentDiv
            className="fixed bg-neutral-800/90 top-0 left-0 w-full h-[calc(100%_-_4rem)] md:h-fit px-10 md:shadow-[0px_0px_20px_3px_#0e0e0e] rounded-md md:p-1 md:w-max"
            onDimensionsCalculated={
                innerWidth > 768
                    ? (width, height) => updatePos(width, height)
                    : undefined
            }
            onClick={(event) => {
                event.stopPropagation();
                if (_setHover) _setHover(false);
            }}
            onMouseEnter={() => {
                if (_setHover) _setHover(true);
            }}
            onMouseLeave={() => {
                if (_setHover) {
                    _setHover(false);
                }
            }}
        >
            <div className="overflow-y-auto md:h-fit flex flex-col gap-y-1 py-20 md:py-0">
                {childrenWithProps}
            </div>
        </ContextMenuContentDiv>
    );
}
