"use client";

import type { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import MobilePlayer from "@/components/MobilePlayer/MobilePlayer";
import MobileBottomNav from "@/components/Navigation/MobileBottomNav";

export default function MobileChrome(): JSX.Element {
    return (
        <>
            <div className="from-background to-background/0 fixed top-0 right-0 left-0 z-40 mx-auto block h-fit items-center justify-center bg-linear-to-b">
                <Link
                    href="/"
                    className="text-foreground-strong text-2xl font-bold"
                >
                    <Image
                        src="/logo-banner.png"
                        alt="RockIt!"
                        className="brand-image mx-auto my-2 aspect-2048/614 h-14 object-contain"
                        width={2048}
                        height={614}
                        priority
                    />
                </Link>
            </div>
            <MobileBottomNav adaptive={false} />
            <MobilePlayer adaptive={false} />
        </>
    );
}
