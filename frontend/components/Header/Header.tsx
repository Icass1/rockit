import Link from "next/link";
import { headers } from "next/headers";
import HeaderRight from "./HeaderRight";
import Image from "next/image";
import SearchBarInput from "../Search/SearchBarInput";

export default async function Header() {
    const headerList = await headers();
    const pathname = headerList.get("x-current-path");

    return (
        <header className="relative z-50 grid w-full grid-cols-[33%_33%_32%] justify-between bg-gradient-to-b from-black/100 via-black/60 via-70% to-black/0 px-4 py-4 text-white">
            {/* Blur overlay */}
            <div
                className="absolute inset-0 -z-10 backdrop-blur-[20px]"
                style={{
                    WebkitMaskImage:
                        "linear-gradient(to bottom, black 33%, transparent 100%)",
                    maskImage:
                        "linear-gradient(to bottom, black 33%, transparent 100%)",
                }}
            ></div>

            {/* Actual content */}
            <Link href="/" className="flex flex-row items-center select-none">
                <Image
                    width={2048}
                    height={614}
                    src="/logo-banner.png"
                    alt="Logo"
                    className="h-14 w-auto"
                />
            </Link>

            {pathname?.startsWith("/radio") ? (
                <label></label>
            ) : (
                <SearchBarInput />
            )}

            <HeaderRight />
        </header>
    );
}
