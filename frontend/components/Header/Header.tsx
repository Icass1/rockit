"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import HeaderRight from "./HeaderRight";
import SearchBarInput from "@/components/Search/SearchBarInput";

export default function Header() {
    const pathname = usePathname();
    const isRadio = pathname?.startsWith("/radio");

    return (
        <header className="relative z-50 grid w-full grid-cols-[33%_33%_32%] items-center justify-between bg-linear-to-b from-black via-black/60 via-70% to-black/0 px-4 py-4 text-white">
            {/* Blur overlay — fades out downward so content below stays visible */}
            <div
                className="absolute inset-0 -z-10 backdrop-blur-[20px]"
                style={{
                    WebkitMaskImage: "linear-gradient(to bottom, black 33%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, black 33%, transparent 100%)",
                }}
            />

            <Link href="/" className="flex select-none items-center">
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
