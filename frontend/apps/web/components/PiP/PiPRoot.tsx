"use client";

import { useState } from "react";
import { PiPCover } from "@/components/PiP/PiPCover";
import { PiPInfo } from "@/components/PiP/PiPInfo";

const S = {
    root: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        backgroundImage: "linear-gradient(to bottom, #202124, #121212)",
        overflow: "hidden",
        padding: "10px",
        boxSizing: "border-box",
    },
} satisfies Record<string, React.CSSProperties>;

export function PiPRoot() {
    const [hover, setHover] = useState(false);

    return (
        <div
            style={S.root}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <PiPCover showControls={hover} />
            <PiPInfo />
        </div>
    );
}

export default PiPRoot;
