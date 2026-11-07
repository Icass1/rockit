"use client";

import type { JSX } from "react";
import MiniPlayerBar from "@/components/MobilePlayer/components/MiniPlayerBar";
import MobilePlayerSheet from "@/components/MobilePlayer/components/MobilePlayerSheet";

export default function MobilePlayer({
    adaptive = true,
}: {
    adaptive?: boolean;
}): JSX.Element {
    return (
        <div className={adaptive ? "md:hidden" : undefined}>
            <MiniPlayerBar />
            <MobilePlayerSheet />
        </div>
    );
}
