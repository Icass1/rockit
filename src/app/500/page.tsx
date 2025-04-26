// rsc/app/500/page.tsx

"use client";

import Link from "next/link";

export default function Error500Page() {
    return (
        <div className="w-full flex flex-col items-center justify-center relative select-none">
            <div className="w-full h-24"></div>
            <div className="w-full h-[calc(100vh-6rem)] flex flex-col items-center justify-center bg-gradient-to-r from-[#d185ca] to-[#ffbb9e]">
                <div className="flex flex-col md:flex-row items-center gap-8 h-auto">
                    {/* Texto principal */}
                    <div className="text-black text-center w-full">
                        <h1 className="text-6xl md:text-9xl font-bold mb-4">404</h1>
                        <p className="text-xl md:text-3xl font-semibold mb-2 text-balance">
                            🎵 Whoops! Looks like this track is off-key :(
                        </p>
                        <p className="text-sm md:text-md font-medium">
                            We couldn’t find the page you’re looking for, but don’t
                            worry, Rock It! still plays on.
                        </p>
                    </div>

                    {/* Tocadiscos */}
                    <div className="relative w-1/2 md:w-2/3 aspect-square flex items-center justify-center">
                        <div className="absolute w-[92%] h-[92%] bg-white rounded-full" />
                        <img
                            src="/vinil-cd.png"
                            alt="Vinyl Record"
                            className="absolute w-[90%] h-[90%] rounded-full object-cover animate-spin-decelerate"
                        />
                        <img
                            src="/brazovinilo.png"
                            alt="Vinyl Arm"
                            className="absolute top-0 right-0 w-[70%] h-[70%] rotate-[-20deg] z-20 translate-x-10 -translate-y-2"
                        />
                    </div>
                </div>

                {/* Botón volver */}
                <Link 
                    href="/"
                    className="mt-10 md:mt-20 px-5 py-2 bg-white text-black font-bold text-lg rounded-full shadow-md md:hover:shadow-lg md:hover:bg-neutral-200 transition"
                >
                    Return Back to Home
                </Link>
            </div>
        </div>
    );
}