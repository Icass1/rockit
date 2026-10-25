"use client";

import type { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderRight from "@/components/Header/HeaderRight";
import SearchBarInput from "@/components/Search/SearchBarInput";

export default function Header(): JSX.Element {
    const pathname = usePathname();
    const isRadio = pathname?.startsWith("/radio");

    return (
        <header className="relative z-50 grid w-full grid-cols-[33%_33%_32%] items-center justify-between px-4 py-4 text-white">
            <div aria-hidden="true" className="app-header-backdrop" />

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
                <div className="flex h-3/4 items-center justify-center">
                    <SearchBarInput />
                </div>
            )}
            {isRadio && <div />}

            <HeaderRight />
        </header>
    );
}
