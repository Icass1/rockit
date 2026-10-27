"use client";

import type { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderBackdrop from "@/components/Header/HeaderBackdrop";
import HeaderRight from "@/components/Header/HeaderRight";
import SearchBarInput from "@/components/Search/SearchBarInput";

export default function Header(): JSX.Element {
    const pathname = usePathname();
    const isRadio = pathname?.startsWith("/radio");

    return (
        <header className="relative z-50 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-between gap-4 px-4 py-4 text-white">
            <HeaderBackdrop />

            <Link href="/" className="flex items-center select-none">
                <Image
                    width={2048}
                    height={614}
                    src="/logo-banner.png"
                    alt="RockIt"
                    className="h-14 w-auto"
                    priority
                />
            </Link>

            {/* Search bar hidden on radio page */}
            {!isRadio && (
                <div className="flex h-3/4 w-full max-w-xl min-w-0 items-center justify-center justify-self-center">
                    <SearchBarInput />
                </div>
            )}
            {isRadio && <div />}

            <HeaderRight />
        </header>
    );
}
