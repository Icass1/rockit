"use client";

import { useSyncExternalStore, type JSX, type ReactNode } from "react";
import dynamic from "next/dynamic";

const DesktopChrome = dynamic(
    () => import("@/components/Layout/shells/DesktopChrome"),
    { ssr: false }
);
const MobileChrome = dynamic(
    () => import("@/components/Layout/shells/MobileChrome"),
    { ssr: false }
);
const query = "(min-width: 768px) and (min-height: 500px)";
function subscribe(onChange: () => void): () => void {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return (): void => media.removeEventListener("change", onChange);
}
function getSnapshot(): boolean {
    return window.matchMedia(query).matches;
}
function getServerSnapshot(): undefined {
    return undefined;
}
/** Compatibility origin: mount one chrome; dedicated builds replace this module. */
export default function ClientShell({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const desktop = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    return (
        <>
            <div
                data-rockit-shell={
                    desktop === undefined
                        ? "pending"
                        : desktop
                          ? "desktop"
                          : "mobile"
                }
                className="bg-background fixed inset-0 pb-0 md:left-12"
            >
                <div
                    id="main-scroll-container"
                    className="webkit-scroll h-full w-full overflow-x-hidden overflow-y-auto pt-28 pb-[calc(160px+env(safe-area-inset-bottom,0px))] md:overflow-x-auto md:pb-24"
                >
                    {children}
                </div>
            </div>
            {desktop === true && <DesktopChrome />}
            {desktop === false && <MobileChrome />}
        </>
    );
}
