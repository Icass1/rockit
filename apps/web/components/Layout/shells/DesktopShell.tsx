"use client";

import type { JSX, ReactNode } from "react";
import DesktopChrome from "@/components/Layout/shells/DesktopChrome";

export default function DesktopShell({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    return (
        <>
            <div
                data-rockit-shell="desktop"
                className="bg-background fixed inset-0 left-12 pb-0"
            >
                <div
                    id="main-scroll-container"
                    className="webkit-scroll h-full w-full overflow-x-auto overflow-x-hidden overflow-y-auto pt-28 pb-24"
                >
                    {children}
                </div>
            </div>
            <DesktopChrome />
        </>
    );
}
