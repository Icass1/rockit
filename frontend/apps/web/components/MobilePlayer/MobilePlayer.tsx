"use client";

import type { JSX } from "react";
import MiniPlayerBar from "@/components/MobilePlayer/components/MiniPlayerBar";
import MobilePlayerSheet from "@/components/MobilePlayer/components/MobilePlayerSheet";

export default function MobilePlayer(): JSX.Element {
    return (
        <>
            <MiniPlayerBar />
            <MobilePlayerSheet />
        </>
    );
}
