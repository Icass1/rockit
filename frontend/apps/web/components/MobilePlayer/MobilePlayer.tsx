"use client";

import type { JSX } from "react";
import dynamic from "next/dynamic";

const MiniPlayerBar = dynamic(() => import("./components/MiniPlayerBar"), {
    ssr: false,
});
const MobilePlayerSheet = dynamic(
    () => import("./components/MobilePlayerSheet"),
    { ssr: false }
);

export default function MobilePlayer(): JSX.Element {
    return (
        <>
            <MiniPlayerBar />
            <MobilePlayerSheet />
        </>
    );
}
