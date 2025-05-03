// src/app/not-found.tsx  (Con App Router)

"use client";

import Image from "@/components/Image";
import Link from "next/link";

export default function NotFoundPage() {
    return (
        <div className="relative flex w-full flex-col items-center justify-center select-none">
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-r from-[#d185ca] to-[#ffbb9e]">
                <div className="flex h-auto flex-col items-center gap-8 md:flex-row">
                    {/* Texto principal */}
                    <div className="w-full text-center text-black">
                        <h1 className="mb-4 text-6xl font-bold md:text-9xl">
                            404
                        </h1>
                        <p className="mb-2 text-xl font-semibold text-balance md:text-3xl">
                            🎵 Whoops! Looks like this track is off-key :(
                        </p>
                        <p className="md:text-md text-sm font-medium">
                            We couldn’t find the page you’re looking for, but
                            don’t worry, Rock It! still plays on.
                        </p>
                    </div>

                    {/* Tocadiscos */}
                    <div className="relative flex aspect-square w-1/2 items-center justify-center md:w-2/3">
                        <div className="absolute h-[92%] w-[92%] rounded-full bg-white" />
                        <Image
                            src="/vinil-cd.png"
                            alt="Vinyl Record"
                            className="animate-spin-decelerate absolute h-[90%] w-[90%] rounded-full object-cover"
                        />
                        <Image
                            src="/brazovinilo.png"
                            alt="Vinyl Arm"
                            className="absolute top-0 right-0 z-20 h-[70%] w-[70%] translate-x-10 -translate-y-2 rotate-[-20deg]"
                        />
                    </div>
                </div>

                {/* Botón volver */}
                <Link
                    href="/"
                    className="mt-10 rounded-full bg-white px-5 py-2 text-lg font-bold text-black shadow-md transition md:mt-20 md:hover:bg-neutral-200 md:hover:shadow-lg"
                >
                    Return Back to Home
                </Link>
            </div>
        </div>
    );
}
