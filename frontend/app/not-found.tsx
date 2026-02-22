import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center select-none">
            <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-r from-[#d185ca] to-[#ffbb9e]">
                <div className="flex h-auto flex-col items-center gap-8 md:flex-row">
                    <div className="w-full text-center text-black">
                        <h1 className="mb-4 text-6xl font-bold md:text-9xl">
                            404
                        </h1>
                        <p className="mb-2 text-xl font-semibold text-balance md:text-3xl">
                            🎵 This track doesn&apos;t exist
                        </p>
                        <p className="text-sm font-medium md:text-base">
                            We couldn&apos;t find what you were looking for.
                        </p>
                    </div>

                    <div className="relative flex aspect-square w-1/2 items-center justify-center md:w-2/3">
                        <div className="absolute h-[92%] w-[92%] rounded-full bg-white" />
                        <Image
                            width={1080}
                            height={1080}
                            src="/vinil-cd.png"
                            alt="Vinyl Record"
                            className="animate-spin-decelerate absolute h-[90%] w-[90%] rounded-full object-cover"
                        />
                        <Image
                            width={500}
                            height={500}
                            src="/brazovinilo.png"
                            alt="Vinyl Arm"
                            className="absolute top-0 right-0 z-20 h-[70%] w-[70%] translate-x-10 -translate-y-2 rotate-[-20deg]"
                        />
                    </div>
                </div>

                <Link
                    href="/"
                    className="mt-10 rounded-full bg-white px-5 py-2 text-lg font-bold text-black shadow-md transition md:mt-20 md:hover:bg-neutral-200"
                >
                    Return Back to Home
                </Link>
            </div>
        </div>
    );
}
