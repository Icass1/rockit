"use client";

import type { JSX, ReactNode } from "react";
import MobileChrome from "@/components/Layout/shells/MobileChrome";

export default function MobileShell({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    return (
        <>
            <div
                data-rockit-shell="mobile"
                className="bg-background fixed inset-0 pb-0"
            >
                <div
                    id="main-scroll-container"
                    className="webkit-scroll h-full w-full overflow-x-hidden overflow-y-auto pt-28 pb-[calc(160px+env(safe-area-inset-bottom,0px))]"
                >
                    {children}
                </div>
            </div>
            <MobileChrome />
        </>
    );
}
