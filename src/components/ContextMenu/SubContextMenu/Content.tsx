import type { ReactNode } from "react";
import React from "react";
import PosAfterRenderDiv from "@/components/PosAfterRenderDiv";
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

    const updatePos: (width: number, height: number) => [number, number] = (
        width: number
    ) => {
        const triggerBoundaries = _triggerRef?.current?.getBoundingClientRect();
        const contextMenuBoundaries =
            _contextMenuDivRef?.current?.getBoundingClientRect();

        if (
            !contextMenuBoundaries ||
            !triggerBoundaries ||
            !_triggerRef?.current
        )
            return [0, 0];

        let x = contextMenuBoundaries.x + contextMenuBoundaries.width + 3;
        const y = triggerBoundaries.y;

        if (x + width > innerWidth) {
            x = contextMenuBoundaries.x - width - 3;
        }

        return [x, y];
    };

    if (!_hover) return;

    return (
        <PosAfterRenderDiv
            className="fixed top-0 left-0 h-[calc(100%_-_4rem)] w-full rounded-md bg-neutral-800/90 px-10 md:h-fit md:w-max md:p-1 md:shadow-[0px_0px_20px_3px_#0e0e0e]"
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
            <div className="flex flex-col gap-y-1 overflow-y-auto py-20 md:h-fit md:py-0">
                {childrenWithProps}
            </div>
        </PosAfterRenderDiv>
    );
}
