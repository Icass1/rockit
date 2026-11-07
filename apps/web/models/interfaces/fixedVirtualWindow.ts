import type { UIEvent } from "react";

export interface FixedVirtualRange {
    startIndex: number;
    endIndex: number;
    topPadding: number;
    bottomPadding: number;
}

export interface FixedVirtualWindow extends FixedVirtualRange {
    containerRef: (node: HTMLElement | null) => void;
    onScroll: (event: UIEvent<HTMLElement>) => void;
}
